#!/usr/bin/env node
// E2E de la recuperació de compte contra una pila Docker LOCAL amb Mailpit (docs/13-testing.md).
// Ús: node tools/e2e-recuperacio.mjs [--limits]
// Crea entitats de prova: només accepta localhost. Cap token ni sessió surt per pantalla.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.env.ESPAIS_E2E_APP ?? "http://localhost";
const MAILPIT = process.env.ESPAIS_E2E_MAILPIT ?? "http://127.0.0.1:8025";
const CAPTURES = process.env.ESPAIS_E2E_CAPTURES ?? "";
const SECRETS = process.env.ESPAIS_E2E_SECRETS ?? "";
const AMB_LIMITS = process.argv.includes("--limits");
const NAVEGADOR =
  process.env.ESPAIS_E2E_NAVEGADOR ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find((ruta) => existsSync(ruta));

for (const url of [APP, MAILPIT]) {
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    console.error(`Només contra una pila local: ${url} no ho és.`);
    process.exit(2);
  }
}
if (!NAVEGADOR) {
  console.error("Cal Chrome, Brave o Chromium, o bé ESPAIS_E2E_NAVEGADOR.");
  process.exit(2);
}

const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secrets = [];
const amaga = (text) => secrets.reduce((t, s) => (s ? t.split(s).join("<secret>") : t), String(text));
const passos = [];
const errorsConsola = [];
let ws;
let seq = 0;
const pendents = new Map();

function check(condicio, descripcio) {
  passos.push(`${condicio ? "OK   " : "FALLA"} ${descripcio}`);
  if (!condicio) throw new Error(`ha fallat: ${descripcio}`);
}

async function api(method, path, body, token, headers = {}) {
  const inici = performance.now();
  const res = await fetch(`${APP}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null), ms: performance.now() - inici };
}

async function correus(to, subject) {
  const query = encodeURIComponent(`to:${to}`);
  const r = await (await fetch(`${MAILPIT}/api/v1/search?query=${query}&limit=200`)).json();
  return r.messages.filter((m) => m.Subject.startsWith(subject));
}

async function enllacNou(to, subject, abans) {
  for (let i = 0; i < 60; i += 1) {
    const llista = await correus(to, subject);
    if (llista.length > abans) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${llista[0].ID}`)).json();
      const url = m.Text.match(/https?:\/\/\S+/)[0];
      secrets.push(url.includes("#") ? url.split("#")[1] : url.split("/").pop());
      return url;
    }
    await sleep(200);
  }
  return null;
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    seq += 1;
    pendents.set(seq, { resolve, reject });
    ws.send(JSON.stringify({ id: seq, method, params }));
  });
}

async function ev(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.text}`);
  return r.result.value;
}

async function waitFor(expression, label, timeout = 10000) {
  const final = Date.now() + timeout;
  while (Date.now() < final) {
    try {
      if (await ev(expression)) return;
    } catch {
      /* la pàgina encara navega */
    }
    await sleep(100);
  }
  throw new Error(`temps exhaurit: ${label}`);
}

async function go(url) {
  await send("Page.navigate", { url });
  await sleep(300);
  await waitFor("document.readyState === 'complete' && !!document.querySelector('#contingut')", "càrrega");
}

async function oblidaSessioLocal() {
  await send("Page.navigate", { url: `${APP}/api/salut` });
  await sleep(300);
  await waitFor("document.readyState === 'complete' && document.body.innerText.includes('ok')", "pàgina sense app");
  await ev("localStorage.removeItem('espais.sessio'), true");
}

const ruta = () => ev("location.pathname");
const text = (selector) => ev(`document.querySelector(${JSON.stringify(selector)})?.textContent.trim() ?? null`);
const sessioDesada = () => ev("localStorage.getItem('espais.sessio')");
const submit = () => ev("document.querySelector('main form').requestSubmit(), true");

async function fill(selector, value) {
  await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

const clickText = (selector, valor) =>
  ev(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(valor)});
    if (!el) return false;
    el.click();
    return true;
  })()`);

async function captura(nom) {
  if (!CAPTURES) return;
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(CAPTURES, `${nom}.png`), Buffer.from(r.data, "base64"));
}

async function entra(email, password) {
  await go(`${APP}/iniciar-sessio`);
  await fill("#email", email);
  await fill("#password", password);
  await submit();
}

async function recuperaPerPantalla(email, password, sessioAntiga, nom) {
  const abans = (await correus(email, "Recupera l’accés")).length;
  await oblidaSessioLocal();
  await go(`${APP}/iniciar-sessio`);
  check(await clickText("main a", "Has oblidat la contrasenya?"), `${nom}: «Inicia sessió» enllaça a la recuperació`);
  await waitFor("location.pathname === '/recuperar' && !!document.querySelector('#email')", "formulari de demanda");
  await fill("#email", email);
  await submit();
  await waitFor("!!document.querySelector('main [role=status]')", "resposta genèrica");
  check(
    (await text("main [role=status]")) ===
      "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova. Caduca al cap d’una hora.",
    `${nom}: la demanda mostra el text genèric`,
  );
  await captura(`${nom}-1-demanda`);
  const url = await enllacNou(email, "Recupera l’accés", abans);
  check(!!url, `${nom}: Mailpit rep el correu de recuperació`);
  check(url.startsWith(`${APP}/recuperar#`) && !url.includes("/recuperar/"), `${nom}: l’enllaç és ${APP}/recuperar#… (fragment)`);
  const token = url.split("#")[1];

  await ev(`localStorage.setItem('espais.sessio', ${JSON.stringify(sessioAntiga)}), true`);
  await go(url);
  await waitFor("!!document.querySelector('#password')", "formulari de contrasenya");
  check((await sessioDesada()) !== null, `${nom}: l’enllaç s’obre encara que el navegador tingui la sessió antiga`);
  check((await ev("location.hash")) === "", `${nom}: el fragment desapareix de la barra`);
  check(!(await ev(`location.href.includes(${JSON.stringify(token)})`)), `${nom}: l’adreça visible no porta el token`);
  check(!(await ev(`document.documentElement.outerHTML.includes(${JSON.stringify(token)})`)), `${nom}: la pàgina no pinta el token`);
  await sleep(200);
  check(!(await ev(`JSON.stringify(history.state ?? null).includes(${JSON.stringify(token)})`)), `${nom}: l’historial no guarda el token`);
  check(
    !(await ev(`performance.getEntries().some((e) => e.name.includes(${JSON.stringify(token)}))`)),
    `${nom}: cap petició del navegador porta el token a l’URL`,
  );
  await captura(`${nom}-2-contrasenya`);

  await fill("#password", "curta");
  await submit();
  await waitFor("!!document.querySelector('#password-error')", "error de camp");
  check((await text("#password-error")).includes("8 caràcters"), `${nom}: una contrasenya curta es marca al camp`);
  await fill("#password", password);
  await submit();
  await waitFor("document.querySelector('main [role=status]')?.textContent.includes('actualitzat')", "confirmació");
  check(
    (await text("main [role=status]")) === "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.",
    `${nom}: es mostra la confirmació`,
  );
  check((await ruta()) === "/recuperar", `${nom}: no entra sol a l’app`);
  check((await sessioDesada()) === null, `${nom}: la sessió antiga del navegador s’esborra i no se n’obre cap`);
  await captura(`${nom}-3-fet`);
  check(await clickText("main a", "Inicia sessió"), `${nom}: hi ha el botó «Inicia sessió»`);
  await waitFor("location.pathname === '/iniciar-sessio' && !!document.querySelector('#email')", "pantalla d’inici");
  return url;
}

async function provaRol({ email, antiga, nova, rol, nom }) {
  await oblidaSessioLocal();
  await entra(email, antiga);
  await waitFor("location.pathname === '/espais'", `entrada inicial de ${nom}`);
  const sessioAntiga = await sessioDesada();
  const tokenAntic = JSON.parse(sessioAntiga).token;
  secrets.push(tokenAntic);
  check(JSON.parse(sessioAntiga).role === rol, `${nom}: abans de recuperar entra com a ${rol}`);

  const url = await recuperaPerPantalla(email, nova, sessioAntiga, nom);

  await fill("#email", email);
  await fill("#password", antiga);
  await submit();
  await waitFor("!!document.querySelector('main .alert-error')", "error amb la contrasenya antiga");
  check((await text("main .alert-error")) === "Email o contrasenya incorrectes.", `${nom}: la contrasenya antiga ja no entra`);
  await fill("#password", nova);
  await submit();
  await waitFor("location.pathname === '/espais'", "entrada amb la contrasenya nova");
  const sessioNova = JSON.parse(await sessioDesada());
  secrets.push(sessioNova.token);
  check(sessioNova.role === rol, `${nom}: amb la contrasenya nova entra com a ${rol} a /espais`);
  check(
    (await ev("document.body.textContent")).includes("Convida coordinadors") === (rol === "responsible"),
    `${nom}: el menú és el del seu rol`,
  );
  await captura(`${nom}-4-dins`);
  if (rol === "coordinator") {
    await go(`${APP}/analisi`);
    check((await ruta()) === "/espais", `${nom}: canviar la ruta a /analisi no li dona accés`);
  }

  check((await api("GET", "/sessio", null, tokenAntic)).status === 401, `${nom}: el token anterior rep 401`);
  check((await api("GET", "/sessio", null, sessioNova.token)).status === 200, `${nom}: el token nou funciona`);
  const creaEspai = await api("POST", "/espais", { name: `Sala ${Date.now()}`, capacity: 5 }, sessioNova.token);
  check(creaEspai.status === (rol === "responsible" ? 201 : 403), `${nom}: el backend aplica el permís de crear espais (${creaEspai.status})`);

  await ev(`localStorage.setItem('espais.sessio', ${JSON.stringify(sessioAntiga)}), true`);
  await go(`${APP}/espais`);
  await waitFor("location.pathname === '/iniciar-sessio'", "expulsió de la sessió antiga");
  check((await sessioDesada()) === null, `${nom}: un navegador amb la sessió antiga la perd i torna a iniciar sessió`);

  await go(url);
  await waitFor("!!document.querySelector('#password')", "formulari amb l’enllaç usat");
  await fill("#password", "una-altra-clau");
  await submit();
  await waitFor("!!document.querySelector('main .alert-error')", "error d’enllaç usat");
  check(
    (await text("main .alert-error")) === "Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou.",
    `${nom}: l’enllaç ja usat es rebutja`,
  );
  await captura(`${nom}-5-enllac-usat`);
  check(await clickText("main button", "Demana un enllaç nou"), `${nom}: s’ofereix demanar un enllaç nou`);
  await waitFor("!!document.querySelector('#email') && !document.querySelector('#password')", "torna a la demanda");

  await go(url);
  await waitFor("!!document.querySelector('#password')", "formulari abans de recarregar");
  await send("Page.reload", {});
  await sleep(300);
  await waitFor("document.readyState === 'complete' && !!document.querySelector('#email')", "recàrrega");
  check(!(await ev("!!document.querySelector('#password')")), `${nom}: en recarregar, el token ja no hi és i es demana l’email`);
  return sessioNova.token;
}

async function nouCompte(sufix) {
  const resp = `resp.${sufix}@example.com`;
  const coord = `coord.${sufix}@example.com`;
  const alta = await api("POST", "/registre", {
    entity_name: `Entitat ${sufix}`,
    typology: null,
    responsible_name: "Anna",
    email: resp,
    password: "secret123",
  });
  check(alta.status === 201, `alta de l’entitat de prova ${sufix}`);
  secrets.push(alta.body.token);
  const convit = await api("POST", "/invitacions", { email: coord }, alta.body.token);
  check(convit.status === 201 && convit.body.delivery === "sent", "la invitació surt per correu i no es mostra l’enllaç");
  const enllac = await enllacNou(coord, "Invitació a ", 0);
  check(enllac?.startsWith(`${APP}/invitar/`), "la invitació arriba a Mailpit amb el domini públic");
  const accept = await api("POST", `/invitacions/${enllac.split("/invitar/")[1]}/acceptar`, { name: "Carla", password: "secret123" });
  check(accept.status === 201 && accept.body.role === "coordinator", "el coordinador accepta la invitació");
  secrets.push(accept.body.token);
  return { resp, coord };
}

async function provaLimits(sufix) {
  const { resp } = await nouCompte(`${sufix}l`);
  const existent = await api("POST", "/recuperacio", { email: resp }, null, { "X-Forwarded-For": "198.51.100.1" });
  const absent = await api("POST", "/recuperacio", { email: `ningu.${sufix}@example.com` }, null, { "X-Forwarded-For": "198.51.100.2" });
  check(existent.status === 200 && absent.status === 200, "compte existent i inexistent responen 200");
  check(JSON.stringify(existent.body) === JSON.stringify(absent.body), "el cos de la resposta és idèntic");
  check(Math.abs(existent.ms - absent.ms) < 150, `el temps de resposta no delata el compte (${existent.ms.toFixed(0)} ms / ${absent.ms.toFixed(0)} ms)`);
  for (let i = 3; i <= 5; i += 1) await api("POST", "/recuperacio", { email: resp }, null, { "X-Forwarded-For": `198.51.100.${i}` });
  await sleep(1500);
  check((await correus(resp, "Recupera l’accés")).length === 3, "el límit per compte talla el quart correu");
  const { resp: fresc } = await nouCompte(`${sufix}m`);
  for (let i = 0; i < 10; i += 1) {
    await api("POST", "/recuperacio", { email: `ningu${i}.${sufix}@example.com` }, null, { "X-Forwarded-For": `203.0.113.${i}` });
  }
  await api("POST", "/recuperacio", { email: fresc }, null, { "X-Forwarded-For": "203.0.113.99" });
  await sleep(1500);
  check((await correus(fresc, "Recupera l’accés")).length === 0, "un X-Forwarded-For inventat no esquiva el límit per IP");
}

const perfil = mkdtempSync(join(tmpdir(), "espais-e2e-"));
if (CAPTURES) mkdirSync(CAPTURES, { recursive: true });
const proc = spawn(
  NAVEGADOR,
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", "about:blank"],
  { stdio: "ignore" },
);
let codi = 0;
try {
  let target;
  for (let i = 0; i < 100 && !target; i += 1) {
    target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json()).catch(() => null);
    if (!target) await sleep(150);
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const p = pendents.get(msg.id);
      pendents.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      errorsConsola.push(`${msg.params.entry.source}: ${msg.params.entry.text}`);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errorsConsola.push(`excepció: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  const sufix = Date.now().toString(36);
  const { resp, coord } = await nouCompte(sufix);
  await provaRol({ email: resp, antiga: "secret123", nova: "NovaClau-Resp-2026", rol: "responsible", nom: "responsable" });
  await provaRol({ email: coord, antiga: "secret123", nova: "NovaClau-Coord-2026", rol: "coordinator", nom: "coordinador" });
  if (AMB_LIMITS) await provaLimits(sufix);
} catch (err) {
  passos.push(`ATURAT ${err.message}`);
  codi = 1;
} finally {
  console.log(passos.map(amaga).join("\n"));
  console.log("\nErrors de consola del navegador:");
  console.log(errorsConsola.length ? errorsConsola.map((e) => `  ${amaga(e).slice(0, 200)}`).join("\n") : "  cap");
  if (SECRETS) writeFileSync(SECRETS, `${secrets.filter(Boolean).join("\n")}\n`, { mode: 0o600 });
  ws?.close();
  proc.kill();
  await sleep(500);
  rmSync(perfil, { recursive: true, force: true });
  process.exit(codi);
}
