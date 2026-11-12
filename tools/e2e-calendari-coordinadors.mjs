#!/usr/bin/env node
// E2E del desplegable de coordinadors i dels colors de sala.
// Contra una pila Docker local. No imprimeix tokens ni contrasenyes.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.env.ESPAIS_E2E_APP ?? "http://localhost";
const PASSWORD = "secret123";
if (!["localhost", "127.0.0.1"].includes(new URL(APP).hostname)) {
  console.error(`Només contra una pila local: ${APP} no ho és.`);
  process.exit(2);
}
const NAVEGADOR =
  process.env.ESPAIS_E2E_NAVEGADOR ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find((ruta) => existsSync(ruta));
if (!NAVEGADOR) {
  console.error("Cal Chrome, Brave o Chromium.");
  process.exit(2);
}

const PORT = 9334;
const sufix = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secrets = [];
const amaga = (text) => secrets.reduce((t, s) => (s ? t.split(s).join("<secret>") : t), String(text));
const passos = [];
let ws;
let seq = 0;
const pendents = new Map();

function check(condicio, descripcio) {
  passos.push(`${condicio ? "OK   " : "FALLA"} ${descripcio}`);
  if (!condicio) throw new Error(`ha fallat: ${descripcio}`);
}

async function api(method, path, body, token) {
  const res = await fetch(`${APP}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (json?.token) secrets.push(json.token);
  return { status: res.status, body: json };
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

async function waitFor(expression, label, timeout = 15000) {
  const final = Date.now() + timeout;
  while (Date.now() < final) {
    try {
      if (await ev(expression)) return;
    } catch {
      /* la pàgina encara navega */
    }
    await sleep(150);
  }
  throw new Error(`temps exhaurit: ${label}`);
}

async function go(url) {
  await send("Page.navigate", { url });
  await sleep(400);
  await waitFor("document.readyState === 'complete'", "càrrega");
}

async function entra(email) {
  await go(`${APP}/iniciar-sessio`);
  await waitFor("!!document.querySelector('#email')", "formulari d’entrada");
  await ev(`(() => {
    const posa = (sel, valor) => {
      const el = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, valor);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    posa('#email', ${JSON.stringify(email)});
    posa('#password', ${JSON.stringify(PASSWORD)});
    document.querySelector('main form').requestSubmit();
    return true;
  })()`);
  await waitFor("location.pathname === '/espais'", "entrada");
  const sessio = JSON.parse(await ev("localStorage.getItem('espais.sessio')"));
  secrets.push(sessio.token);
  return sessio;
}

async function surt() {
  await ev("localStorage.removeItem('espais.sessio'), true");
  await go(`${APP}/iniciar-sessio`);
}

const perfil = mkdtempSync(join(tmpdir(), "espais-e2e-coord-"));
const proc = spawn(
  NAVEGADOR,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${perfil}`,
    "--window-size=1280,900",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let codi = 0;
try {
  const registre = await api("POST", "/registre", {
    entity_name: `E2E Coordinadors ${sufix}`,
    typology: "colla",
    responsible_name: "Rita",
    email: `rita.${sufix}@example.com`,
    password: PASSWORD,
  });
  check(registre.status === 201, "el responsable es registra");
  const tokenRita = registre.body.token;
  secrets.push(tokenRita);

  async function accepta(email, name) {
    const invited = await api("POST", "/invitacions", { email }, tokenRita);
    check(invited.status === 201, `invitació de ${name}`);
    const token = invited.body.accept_url.split("/").pop();
    secrets.push(token);
    const accepted = await api("POST", `/invitacions/${token}/acceptar`, { name, password: PASSWORD });
    check(accepted.status === 201, `${name} accepta`);
    secrets.push(accepted.body.token);
    return accepted.body;
  }

  const anna1 = await accepta(`anna1.${sufix}@example.com`, "Anna");
  const anna2 = await accepta(`anna2.${sufix}@example.com`, "Anna");
  const nuria = await accepta(`nuria.${sufix}@example.com`, "Núria");
  const pendent = await api("POST", "/invitacions", { email: `pendent.${sufix}@example.com` }, tokenRita);
  check(pendent.status === 201, "una invitació sense acceptar es crea");

  const altra = await api("POST", "/registre", {
    entity_name: `E2E Altra ${sufix}`,
    typology: "colla",
    responsible_name: "Berta",
    email: `berta.${sufix}@example.com`,
    password: PASSWORD,
  });
  check(altra.status === 201, "una segona entitat es registra");
  secrets.push(altra.body.token);
  const invitedB = await api("POST", "/invitacions", { email: `fora.${sufix}@example.com` }, altra.body.token);
  const tokenB = invitedB.body.accept_url.split("/").pop();
  secrets.push(tokenB);
  const fora = await api("POST", `/invitacions/${tokenB}/acceptar`, { name: "Foraster", password: PASSWORD });
  check(fora.status === 201, "el coordinador de l’altra entitat accepta");
  secrets.push(fora.body.token);

  const llista = await api("GET", "/entitat/coordinadors", null, tokenRita);
  check(llista.status === 200, "el responsable llegeix els coordinadors");
  check(llista.body.map((p) => p.name).join(",") === "Anna,Anna,Núria", "la llista ordena pel nom i inclou els homònims");
  check(llista.body.every((p) => !("email" in p)), "la llista no porta correu");
  check(!llista.body.some((p) => p.name === "Rita" || p.name === "Foraster"), "ni el responsable ni l’altra entitat surten");
  check(new Set(llista.body.map((p) => p.id)).size === 3, "cada persona té un id propi");
  const [idAnnaA, idAnnaB] = llista.body.filter((p) => p.name === "Anna").map((p) => p.id);
  check(idAnnaA !== idAnnaB, "dos Anna tenen id diferent");

  check((await api("GET", "/entitat/coordinadors", null, anna1.token)).status === 403, "un coordinador rep 403");
  const llistaB = await api("GET", "/entitat/coordinadors", null, altra.body.token);
  check(llistaB.status === 200 && llistaB.body.map((p) => p.name).join(",") === "Foraster", "l’altra entitat només veu el seu coordinador");

  const sala1 = await api("POST", "/espais", { name: "Sala Croses", capacity: 10 }, tokenRita);
  const sala2 = await api("POST", "/espais", { name: "Sala Manilles", capacity: 10 }, tokenRita);
  check(sala1.status === 201 && sala2.status === 201, "el responsable crea dues sales");
  const inici = "2026-11-12T18:00:00+01:00";
  const fi = "2026-11-12T19:00:00+01:00";
  const reserva1 = await api(
    "POST",
    "/reserves",
    { space_id: sala1.body.id, starts_at: inici, ends_at: fi },
    anna1.token,
  );
  const reserva2 = await api(
    "POST",
    "/reserves",
    { space_id: sala2.body.id, starts_at: inici, ends_at: fi },
    anna2.token,
  );
  check(reserva1.status === 201 && reserva2.status === 201, "cada Anna reserva una sala a la mateixa hora");
  check(reserva1.body.coordinator_id === null, "qui crea la reserva no rep l’id a la resposta");

  const vistes = await api("GET", `/reserves?des=${encodeURIComponent(inici)}&fins=${encodeURIComponent(fi)}`, null, tokenRita);
  check(vistes.status === 200 && vistes.body.length === 2, "el responsable veu les dues reserves");
  check(vistes.body.every((r) => r.coordinator_id), "el responsable rep l’id de cada reserva");
  const aliena = await api(
    "GET",
    `/reserves?des=${encodeURIComponent(inici)}&fins=${encodeURIComponent(fi)}`,
    null,
    anna1.token,
  );
  const deLaltra = aliena.body.find((r) => r.id === reserva2.body.id);
  check(deLaltra.coordinator_name === null && deLaltra.coordinator_id === null, "el coordinador no veu el nom ni l’id d’una reserva aliena");
  check(nuria.user_id && !vistes.body.some((r) => r.coordinator_id === nuria.user_id), "Núria, sense reserves, no surt a la llista de reserves");

  let target;
  for (let i = 0; i < 100 && !target; i += 1) {
    target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
      .then((r) => r.json())
      .catch(() => null);
    if (!target) await sleep(150);
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return;
    const p = pendents.get(msg.id);
    pendents.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  await entra(`rita.${sufix}@example.com`);
  await go(`${APP}/calendari?cerca=Núria`);
  await waitFor("!!document.querySelector('#coordinador-calendari')", "desplegable del responsable");
  await waitFor(
    "document.querySelectorAll('#coordinador-calendari option').length === 4",
    "tres coordinadors i Tots",
  );
  const opcions = await ev(
    "[...document.querySelectorAll('#coordinador-calendari option')].map((o) => ({ v: o.value, t: o.textContent }))",
  );
  check(opcions[0].t === "Tots" && opcions[0].v === "", "la primera opció és Tots");
  check(opcions.filter((o) => o.t === "Anna").length === 2, "els dos Anna són dues opcions");
  check(opcions.some((o) => o.t === "Núria"), "Núria surt encara que no tingui reserva aquesta setmana");
  check(!(await ev("!!document.querySelector('#cerca-coordinador')")), "ja no hi ha el camp de text");
  await waitFor(
    "document.querySelectorAll('.llegenda-calendari[aria-label=Coordinadors] li').length === 2",
    "la llegenda mostra les dues persones amb reserva",
  );
  const nomsLlegenda = await ev(
    "[...document.querySelectorAll('.llegenda-calendari[aria-label=Coordinadors] li')].map((li) => li.textContent.trim())",
  );
  check(
    nomsLlegenda.length === 2 && nomsLlegenda.every((nom) => nom === "Anna"),
    "una cerca antiga per text no amaga cap Anna",
  );

  const colors = await ev(
    "[...document.querySelectorAll('.llegenda-calendari[aria-label=Sales] .llegenda-calendari__mostra')].map((el) => getComputedStyle(el).backgroundColor)",
  );
  check(
    colors.length === 2 && colors.every((color) => color && color !== "rgba(0, 0, 0, 0)"),
    `les dues sales tenen un color visible (${colors.join(" / ")})`,
  );

  await ev(`(() => {
    const sel = document.querySelector('#coordinador-calendari');
    sel.value = ${JSON.stringify(idAnnaA)};
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await waitFor(`location.search.includes(${JSON.stringify(idAnnaA)})`, "la URL guarda la persona");
  await waitFor(
    "document.querySelectorAll('.llegenda-calendari[aria-label=Coordinadors] li').length === 1",
    "tria una Anna i la llegenda en deixa una",
  );
  await go(`${APP}/calendari?coordinador=${idAnnaA}`);
  await waitFor(
    `document.querySelector('#coordinador-calendari')?.value === ${JSON.stringify(idAnnaA)}`,
    "recarregar conserva la persona",
  );
  await go(`${APP}/calendari?coordinador=00000000-0000-0000-0000-000000000099`);
  await waitFor(
    "document.querySelector('#coordinador-calendari')?.value === '' && !location.search.includes('coordinador=')",
    "un id desconegut torna a Tots",
  );

  await surt();
  await entra(`anna1.${sufix}@example.com`);
  await go(`${APP}/calendari?coordinador=${idAnnaB}`);
  await waitFor("location.pathname === '/calendari' && !location.search.includes('coordinador=')", "al coordinador se li esborra el filtre");
  check(!(await ev("!!document.querySelector('#coordinador-calendari')")), "el coordinador no veu el desplegable");
  await ev(`(() => {
    const sel = document.querySelector('#espai-calendari');
    sel.value = ${JSON.stringify(sala2.body.id)};
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await waitFor(
    `location.search.includes(${JSON.stringify(`espai=${sala2.body.id}`)})`,
    "el coordinador obre la sala de l’altra Anna",
  );
  await waitFor("document.querySelector('#contingut').textContent.includes('Ocupat')", "veu l’altra reserva com a Ocupat");
  check(
    !(await ev("document.querySelector('#contingut').textContent.includes('Núria')")),
    "el calendari del coordinador no mostra Núria",
  );

  console.log(passos.join("\n"));
  console.log(`\n${passos.length} comprovacions`);
} catch (error) {
  codi = 1;
  console.error(amaga(error.stack || error.message));
  if (passos.length) console.error(passos.join("\n"));
} finally {
  proc.kill();
  await sleep(500);
  for (let i = 0; i < 5; i += 1) {
    try {
      rmSync(perfil, { recursive: true, force: true });
      break;
    } catch {
      await sleep(300);
    }
  }
  process.exit(codi);
}
