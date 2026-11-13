#!/usr/bin/env node
// E2E visual del calendari: tres coordinadors, tres sales, clar i fosc.
// Contra una pila Docker local aïllada. No imprimeix tokens ni contrasenyes.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = process.env.ESPAIS_E2E_APP ?? "http://localhost";
const PASSWORD = "secret123";
const ARREL = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURES = process.env.ESPAIS_E2E_CAPTURES ?? join(ARREL, "artifacts", "e2e-calendari-visual");
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

const PORT = 9336;
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
  if (json?.accept_url) secrets.push(String(json.accept_url));
  return { status: res.status, body: json, text };
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

async function waitFor(expression, label, timeout = 20000) {
  const final = Date.now() + timeout;
  while (Date.now() < final) {
    try {
      if (await ev(expression)) return;
    } catch {
      /* la pàgina encara navega */
    }
    await sleep(200);
  }
  throw new Error(`temps exhaurit: ${label}`);
}

async function go(url) {
  await send("Page.navigate", { url });
  await sleep(500);
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

async function desarCaptura(nom, params) {
  const shot = await send("Page.captureScreenshot", { format: "png", ...params });
  const ruta = join(CAPTURES, nom);
  writeFileSync(ruta, Buffer.from(shot.data, "base64"));
  console.log(`captura ${ruta}`);
}

async function captura(nom) {
  const vista = await ev(`document.querySelector(".sx__view-selection-selected-item")?.textContent || ""`);
  if (vista && !vista.includes("Setmana")) {
    await ev(`document.querySelector(".sx__view-selection")?.click(), true`);
    await sleep(250);
    await ev(`(() => {
      const item = [...document.querySelectorAll(".sx__view-selection-item")].find((el) => el.textContent.includes("Setmana"));
      item?.click();
      return true;
    })()`);
    await sleep(700);
  }
  await ev(`(() => {
    const cal = document.querySelector(".calendari-espais");
    if (cal) cal.scrollTop = 0;
    window.scrollTo(0, 0);
    return true;
  })()`);
  await sleep(300);
  await desarCaptura(nom, { captureBeyondViewport: true });
}

async function capturaLlegenda(nom) {
  await ev("window.scrollTo(0, 0), true");
  await sleep(200);
  const caixa = await ev(`(() => {
    const nodes = [...document.querySelectorAll(".llegenda-calendari")];
    const rects = nodes.map((el) => el.getBoundingClientRect()).filter((rect) => rect.width > 0);
    const esquerra = Math.max(0, Math.min(...rects.map((rect) => rect.left)) - 16);
    const dalt = Math.max(0, Math.min(...rects.map((rect) => rect.top)) - 16);
    const dreta = Math.max(...rects.map((rect) => rect.right)) + 16;
    const baix = Math.max(...rects.map((rect) => rect.bottom)) + 16;
    return { x: esquerra, y: dalt, width: dreta - esquerra, height: baix - dalt };
  })()`);
  await desarCaptura(nom, { clip: { ...caixa, scale: 1 } });
}

function rgbDe(text) {
  const m = String(text).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function llum([r, g, b]) {
  const c = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function to([r, g, b]) {
  const [rr, gg, bb] = [r, g, b].map((v) => v / 255);
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  return (h * 60 + 360) % 360;
}

function colorsSeparats(llista) {
  const colors = llista.map(rgbDe).filter(Boolean);
  if (colors.length < 2) return false;
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const gir = Math.abs(to(colors[i]) - to(colors[j])) % 360;
      const hue = Math.min(gir, 360 - gir);
      const dL = Math.abs(llum(colors[i]) - llum(colors[j]));
      if (hue < 28 && dL < 0.18) return false;
    }
  }
  return true;
}

mkdirSync(CAPTURES, { recursive: true });
const perfil = mkdtempSync(join(tmpdir(), "espais-e2e-visual-"));
const proc = spawn(
  NAVEGADOR,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${perfil}`,
    "--window-size=1440,1800",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let codi = 0;
const resum = { entitat: "", coordinadors: [], sales: [], reserves: [] };
try {
  const registre = await api("POST", "/registre", {
    entity_name: `E2E Visual ${sufix}`,
    typology: "colla",
    responsible_name: "Cugat Coma",
    email: `responsable.${sufix}@example.com`,
    password: PASSWORD,
  });
  check(registre.status === 201, `el responsable es registra (${registre.status})`);
  const tokenRita = registre.body.token;
  secrets.push(tokenRita);
  resum.entitat = `E2E Visual ${sufix}`;

  async function accepta(email, name) {
    const invited = await api("POST", "/invitacions", { email }, tokenRita);
    check(invited.status === 201, `invitació de ${name} (${invited.status} ${invited.text?.slice(0, 80) ?? ""})`);
    const token = invited.body.accept_url.split("/").pop();
    secrets.push(token);
    const accepted = await api("POST", `/invitacions/${token}/acceptar`, { name, password: PASSWORD });
    check(accepted.status === 201, `${name} accepta (${accepted.status})`);
    secrets.push(accepted.body.token);
    return { ...accepted.body, email, name };
  }

  const josep = await accepta(`josep.${sufix}@example.com`, "Josep Oriol");
  const oriol = await accepta(`oriol.${sufix}@example.com`, "Oriol Ferrer");
  const nuria = await accepta(`nuria.${sufix}@example.com`, "Núria Serra");
  resum.coordinadors = [josep.name, oriol.name, nuria.name];

  const croses = await api(
    "POST",
    "/espais",
    {
      name: "Sala Croses",
      capacity: 20,
      windows: [0, 2, 4].map((weekday) => ({ weekday, start: "17:00", end: "21:00" })),
    },
    tokenRita,
  );
  const manilles = await api(
    "POST",
    "/espais",
    {
      name: "Sala Manilles",
      capacity: 16,
      windows: [1, 3].map((weekday) => ({ weekday, start: "18:00", end: "22:00" })),
    },
    tokenRita,
  );
  const pilars = await api(
    "POST",
    "/espais",
    {
      name: "Sala Pilars",
      capacity: 12,
      windows: [5, 6].map((weekday) => ({ weekday, start: "10:00", end: "14:00" })),
    },
    tokenRita,
  );
  check(croses.status === 201 && manilles.status === 201 && pilars.status === 201, "el responsable crea les tres sales");
  check(
    croses.body.windows.map((w) => w.weekday).join(",") === "0,2,4" &&
      manilles.body.windows.map((w) => w.weekday).join(",") === "1,3" &&
      pilars.body.windows.map((w) => w.weekday).join(",") === "5,6",
    "cada sala té dies diferents",
  );
  resum.sales = [
    { nom: "Sala Croses", dies: "dl dc dv 17:00-21:00", id: croses.body.id },
    { nom: "Sala Manilles", dies: "dt dj 18:00-22:00", id: manilles.body.id },
    { nom: "Sala Pilars", dies: "ds dg 10:00-14:00", id: pilars.body.id },
  ];

  const plans = [
    [josep, croses.body.id, "Sala Croses", "2026-11-09T17:30:00+01:00", "2026-11-09T18:30:00+01:00"],
    [oriol, croses.body.id, "Sala Croses", "2026-11-09T19:00:00+01:00", "2026-11-09T20:00:00+01:00"],
    [nuria, croses.body.id, "Sala Croses", "2026-11-11T17:00:00+01:00", "2026-11-11T18:00:00+01:00"],
    [josep, manilles.body.id, "Sala Manilles", "2026-11-10T18:00:00+01:00", "2026-11-10T19:00:00+01:00"],
    [oriol, manilles.body.id, "Sala Manilles", "2026-11-12T19:30:00+01:00", "2026-11-12T20:30:00+01:00"],
    [nuria, pilars.body.id, "Sala Pilars", "2026-11-14T11:00:00+01:00", "2026-11-14T12:00:00+01:00"],
    [josep, pilars.body.id, "Sala Pilars", "2026-11-14T12:30:00+01:00", "2026-11-14T13:30:00+01:00"],
  ];
  for (const [persona, espaiId, sala, inici, fi] of plans) {
    const creada = await api("POST", "/reserves", { space_id: espaiId, starts_at: inici, ends_at: fi }, persona.token);
    check(creada.status === 201, `${persona.name} reserva ${sala} (${creada.status} ${creada.text?.slice(0, 120) ?? ""})`);
    resum.reserves.push(`${persona.name} · ${sala} · ${inici.slice(0, 16)}–${fi.slice(11, 16)}`);
  }

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
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false });

  await entra(`responsable.${sufix}@example.com`);
  await go(`${APP}/calendari`);
  await waitFor("!!document.querySelector('#coordinador-calendari')", "desplegable del responsable");
  await waitFor(
    "document.querySelectorAll('.sx__time-grid-event-title').length >= 7",
    "les set reserves són a la graella",
    25000,
  );
  const titols = await ev("[...document.querySelectorAll('.sx__time-grid-event-title')].map((el) => el.textContent.trim())");
  check(titols.filter((t) => t === "Josep Oriol").length === 3, `Josep Oriol té 3 reserves (${titols.join(", ")})`);
  check(titols.filter((t) => t === "Oriol Ferrer").length === 2, "Oriol Ferrer té 2 reserves");
  check(titols.filter((t) => t === "Núria Serra").length === 2, "Núria Serra té 2 reserves");

  const llegendaSales = await ev(`(() => {
    return [...document.querySelectorAll('.llegenda-calendari[aria-label=Sales] li')].map((li) => ({
      nom: li.textContent.trim(),
      color: getComputedStyle(li.querySelector('.llegenda-calendari__mostra')).backgroundColor,
    }));
  })()`);
  check(llegendaSales.map((s) => s.nom).sort().join("|") === "Sala Croses|Sala Manilles|Sala Pilars", "la llegenda mostra les tres sales");
  check(colorsSeparats(llegendaSales.map((s) => s.color)), `els tres colors de sala se separen (${llegendaSales.map((s) => s.nom + " " + s.color).join(" · ")})`);

  check(
    !(await ev("!!document.querySelector('.llegenda-calendari[aria-label=Coordinadors]')")),
    "no hi ha llegenda de coordinadors",
  );

  const events = await ev(`(() => {
    return [...document.querySelectorAll('.sx__time-grid-event')].map((el) => {
      const estil = getComputedStyle(el);
      const titol = el.querySelector('.sx__time-grid-event-title');
      const estilTitol = titol ? getComputedStyle(titol) : null;
      return {
        nom: titol ? titol.textContent.trim() : "",
        mida: estilTitol ? estilTitol.fontSize : "",
        pes: estilTitol ? estilTitol.fontWeight : "",
        retall: estilTitol ? estilTitol.textOverflow : "",
        ara: estilTitol ? estilTitol.whiteSpace : "",
        color: estil.backgroundColor,
        imatge: estil.backgroundImage,
        classe: [...el.classList].find((c) => c.startsWith('reserva-tramat-')) || "",
      };
    });
  })()`);
  check(events.every((e) => e.mida === "12px" && (e.pes === "500" || e.pes === 500)), `el nom fa 12px i pes 500 (${events[0]?.mida} / ${events[0]?.pes})`);
  check(events.every((e) => e.retall === "ellipsis" && e.ara === "nowrap"), "el nom es talla amb punts suspensius");
  const perSala = Object.fromEntries(llegendaSales.map((s) => [s.nom, s.color]));
  check(
    events.every((e) => !e.classe && e.imatge === "none"),
    "cap reserva del responsable porta tramat",
  );
  const colorPerReserva = {
    "Josep Oriol": [perSala["Sala Croses"], perSala["Sala Manilles"], perSala["Sala Pilars"]],
    "Oriol Ferrer": [perSala["Sala Croses"], perSala["Sala Manilles"]],
    "Núria Serra": [perSala["Sala Croses"], perSala["Sala Pilars"]],
  };
  for (const [nom, esperats] of Object.entries(colorPerReserva)) {
    const vistos = events.filter((e) => e.nom === nom).map((e) => e.color).sort();
    check(vistos.join("|") === [...esperats].sort().join("|"), `${nom} porta els colors de les seves sales (${vistos.join(", ")})`);
  }
  check(events.every((e) => e.color && e.color !== "rgba(0, 0, 0, 0)"), "el fons de la reserva és el color de la sala");

  await captura("responsable-clar.png");
  await capturaLlegenda("llegenda-clar.png");

  async function tria(sel, valor) {
    await ev(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      el.value = ${JSON.stringify(valor)};
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  }

  await tria("#espai-calendari", croses.body.id);
  await waitFor(
    "document.querySelectorAll('.sx__time-grid-event-title').length === 3",
    "el filtre de Sala Croses deixa 3 reserves",
  );
  await tria("#espai-calendari", pilars.body.id);
  await waitFor(
    "document.querySelectorAll('.sx__time-grid-event-title').length === 2",
    "el filtre de Sala Pilars deixa 2 reserves",
  );
  await go(`${APP}/calendari?vista=llista`);
  await waitFor("document.querySelectorAll('li').length >= 7", "la llista mostra les reserves");
  const llista = String(await ev("document.querySelector('#contingut').innerText")).replace(/\u202f/g, " ").replace(/\./g, ":");
  check(llista.includes("Sala Croses") && llista.includes("17:30") && llista.includes("19:00"), "la llista situa Croses a la tarda");
  check(llista.includes("Sala Manilles") && llista.includes("18:00") && llista.includes("19:30"), "la llista situa Manilles al seu horari");
  check(llista.includes("Sala Pilars") && llista.includes("11:00") && llista.includes("12:30"), "la llista situa Pilars al matí");
  check(llista.includes("Josep Oriol") && llista.includes("Oriol Ferrer") && llista.includes("Núria Serra"), "la llista diu qui ha reservat");
  await go(`${APP}/calendari`);
  await waitFor("!!document.querySelector('#coordinador-calendari')", "el calendari torna a la graella");
  await waitFor("document.querySelectorAll('.sx__time-grid-event-title').length >= 7", "la graella torna a tenir les set", 25000);

  await tria("#espai-calendari", "");
  await tria("#coordinador-calendari", josep.user_id);
  await waitFor(
    "document.querySelectorAll('.sx__time-grid-event-title').length === 3 && [...document.querySelectorAll('.sx__time-grid-event-title')].every((el) => el.textContent.trim() === 'Josep Oriol')",
    "el filtre de Josep Oriol només deixa les seves",
  );
  await tria("#coordinador-calendari", "");
  await waitFor("document.querySelectorAll('.sx__time-grid-event-title').length >= 7", "Tots torna a mostrar les set");

  await ev("document.querySelector('#mode-fosc')?.click()");
  await waitFor(
    "(document.documentElement.getAttribute('data-theme') || '').endsWith('-dark')",
    "el mode fosc s’aplica",
  );
  await waitFor("document.querySelectorAll('.sx__time-grid-event-title').length >= 7", "el fosc torna a pintar les reserves", 25000);
  const colorsFosc = await ev(`(() => {
    return [...document.querySelectorAll('.llegenda-calendari[aria-label=Sales] li')].map((li) => getComputedStyle(li.querySelector('.llegenda-calendari__mostra')).backgroundColor);
  })()`);
  check(colorsSeparats(colorsFosc), `en fosc les sales se separen (${colorsFosc.join(" · ")})`);
  check(
    [...colorsFosc].sort().join("|") === llegendaSales.map((s) => s.color).sort().join("|"),
    "el fosc conserva els mateixos tons de sala",
  );
  check(
    !(await ev("!!document.querySelector('.llegenda-calendari[aria-label=Coordinadors]')")),
    "en fosc tampoc hi ha llegenda de coordinadors",
  );
  check(
    !(await ev("[...document.querySelectorAll('.sx__time-grid-event')].some((el) => [...el.classList].some((c) => c.startsWith('reserva-tramat-')))")),
    "en fosc cap reserva porta tramat",
  );
  await captura("responsable-fosc.png");
  await capturaLlegenda("llegenda-fosc.png");

  await ev("document.querySelector('#mode-clar')?.click()");
  await surt();

  const colorsResponsable = Object.fromEntries(llegendaSales.map((s) => [s.nom, s.color]));
  for (const persona of [josep, oriol, nuria]) {
    await entra(persona.email);
    await go(`${APP}/calendari`);
    await waitFor("location.pathname === '/calendari'", "calendari del coordinador");
    await waitFor(
      "document.querySelector('#contingut') && document.querySelector('#contingut').textContent.includes('Les meves reserves')",
      `${persona.name} veu les seves reserves`,
    );
    check(!(await ev("!!document.querySelector('#coordinador-calendari')")), `${persona.name} no té el filtre de coordinador`);
    const propies = await ev("[...document.querySelectorAll('.sx__time-grid-event-title')].map((el) => el.textContent.trim())");
    const aliens = ["Josep Oriol", "Oriol Ferrer", "Núria Serra"].filter((nom) => nom !== persona.name);
    check(propies.length > 0 && propies.every((t) => !aliens.includes(t)), `${persona.name} no veu el nom d’un altre (${propies.join(", ")})`);
    const colorsPropis = await ev(`(() => {
      return [...document.querySelectorAll('.llegenda-calendari[aria-label=Sales] li')].map((li) => ({
        nom: li.textContent.trim(),
        color: getComputedStyle(li.querySelector('.llegenda-calendari__mostra')).backgroundColor,
      }));
    })()`);
    check(
      colorsPropis.every((s) => colorsResponsable[s.nom] === s.color),
      `${persona.name} veu els mateixos colors de sala`,
    );
    if (persona.name === "Josep Oriol") {
      await captura("coordinador-josep-clar.png");
      await ev("document.querySelector('#mode-fosc')?.click()");
      await waitFor(
        "(document.documentElement.getAttribute('data-theme') || '').endsWith('-dark')",
        "el coordinador passa a fosc",
      );
      await waitFor("document.querySelectorAll('.sx__time-grid-event-title').length >= 3", "les reserves del coordinador en fosc", 25000);
      await captura("coordinador-josep-fosc.png");
      await ev("document.querySelector('#mode-clar')?.click()");
      await waitFor(
        "!(document.documentElement.getAttribute('data-theme') || '').endsWith('-dark')",
        "el coordinador torna a clar",
      );
      await waitFor("!!document.querySelector('#espai-calendari')", "el filtre d’espai del coordinador");
      await tria("#espai-calendari", pilars.body.id);
      await waitFor(`location.search.includes(${JSON.stringify(pilars.body.id)})`, "Josep obre Sala Pilars");
      await waitFor("document.querySelectorAll('.sx__week-grid__hour-text').length > 2", "l’eix de Sala Pilars");
      const hores = await ev("[...document.querySelectorAll('.sx__week-grid__hour-text')].map((el) => el.textContent.trim()).filter(Boolean)");
      check(hores.some((h) => h.startsWith("10")) && !hores.some((h) => h.startsWith("17")), `amb Sala Pilars, Josep veu el matí (${hores.join(", ")})`);
      const vistes = await ev("[...document.querySelectorAll('.sx__time-grid-event-title')].map((el) => el.textContent.trim())");
      check(vistes.includes("Teva") && vistes.includes("Ocupat") && !vistes.includes("Núria Serra"), `a la sala, l’aliena és Ocupat (${vistes.join(", ")})`);
    }
    await surt();
  }

  console.log(passos.join("\n"));
  console.log("\nDADES");
  console.log(JSON.stringify(resum, null, 2));
  console.log(`\n${passos.length} comprovacions`);
} catch (error) {
  codi = 1;
  console.error(amaga(error.stack || error.message));
  if (passos.length) console.error(passos.join("\n"));
} finally {
  proc.kill();
  await sleep(400);
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
