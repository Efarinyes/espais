#!/usr/bin/env node
// E2E de l’avís i la política de cookies contra una pila local (docs/13-testing.md).
// No crea entitats ni llegeix correu. Es nega a córrer fora de localhost.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.env.ESPAIS_E2E_APP ?? "http://localhost";
const NAVEGADOR =
  process.env.ESPAIS_E2E_NAVEGADOR ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find((ruta) => existsSync(ruta));

if (!["localhost", "127.0.0.1"].includes(new URL(APP).hostname)) {
  console.error(`Només contra una pila local: ${APP} no ho és.`);
  process.exit(2);
}
if (!NAVEGADOR) {
  console.error("Cal Chrome, Brave o Chromium, o bé ESPAIS_E2E_NAVEGADOR.");
  process.exit(2);
}

const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const passos = [];
let ws;
let seq = 0;
const pendents = new Map();

function check(condicio, descripcio) {
  passos.push(`${condicio ? "OK   " : "FALLA"} ${descripcio}`);
  if (!condicio) throw new Error(`ha fallat: ${descripcio}`);
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

async function cookiesHttp() {
  const resultat = await send("Network.getCookies", { urls: [APP] });
  return resultat.cookies ?? [];
}

async function hostsAliens() {
  return ev(`(() => {
    const propi = location.host;
    const urls = [
      ...performance.getEntriesByType("resource").map((e) => e.name),
      ...[...document.scripts].map((s) => s.src).filter(Boolean),
    ];
    return [...new Set(urls.map((url) => new URL(url, location.href).host).filter((host) => host !== propi))];
  })()`);
}

async function comprovarMida(amplada, alcada, nom) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: amplada,
    height: alcada,
    deviceScaleFactor: amplada < 800 ? 2 : 1,
    mobile: amplada < 800,
  });
  await go(`${APP}/`);
  await waitFor("!!document.querySelector('#nota-funcio')", `${nom}: avís visible`);
  const mida = await ev(`(() => {
    const avis = document.querySelector("#nota-funcio");
    const boto = avis.querySelector("button");
    const enllac = avis.querySelector("a");
    const doc = document.documentElement;
    return {
      boto: boto.getBoundingClientRect().height,
      enllac: enllac.getBoundingClientRect().height,
      scroll: doc.scrollWidth <= doc.clientWidth + 1,
      text: avis.innerText,
    };
  })()`);
  check(mida.text.includes("Política de cookies") && mida.text.includes("Tanca l’avís"), `${nom}: text de l’avís`);
  check(!mida.text.includes("Accepta") && !mida.text.includes("Rebutja"), `${nom}: sense acceptar ni rebutjar`);
  check(mida.boto >= 44 && mida.enllac >= 44, `${nom}: toc d’almenys 44 px (${mida.boto} / ${mida.enllac})`);
  check(mida.scroll, `${nom}: sense desplaçament horitzontal`);
}

const perfil = mkdtempSync(join(tmpdir(), "espais-e2e-cookies-"));
const proc = spawn(
  NAVEGADOR,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);
let codi = 0;
try {
  let target;
  for (let i = 0; i < 100 && !target; i += 1) {
    target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
      .then((r) => r.json())
      .catch(() => null);
    if (!target) await sleep(150);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error("el navegador no ha obert el depurador");
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
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  await comprovarMida(390, 844, "mòbil");
  check((await ev("document.cookie")) === "", "mòbil: document.cookie buit a la primera visita");
  check((await cookiesHttp()).length === 0, "mòbil: cap galeta HTTP, tampoc HttpOnly");
  check((await hostsAliens()).length === 0, `mòbil: cap recurs de tercers (${(await hostsAliens()).join(", ")})`);
  const claus = await ev("Object.keys(localStorage).sort().join(',')");
  check(claus === "espais.mode" || claus === "", `mòbil: abans de decidir només el mode, si n’hi ha (${claus})`);
  check((await ev("localStorage.getItem('espais.sessio')")) === null, "mòbil: la landing no obre sessió");
  check((await ev("localStorage.getItem('espais.avis-cookies')")) === null, "mòbil: l’avís encara no s’ha desat");

  await ev(`document.querySelector("#nota-funcio a").click()`);
  await waitFor("location.pathname === '/politica-de-cookies'", "política");
  const politica = await ev("document.querySelector('main').innerText");
  check(politica.includes("espais.sessio") && politica.includes("Eduard Farinyes"), "la política descriu la sessió i qui informa");
  check(politica.includes("No hi ha un consentiment per retirar"), "la política diu que no hi ha consentiment per retirar");
  check(
    await ev("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
    "política: sense desplaçament horitzontal",
  );
  check((await ev("document.querySelector('#nota-funcio')")) === null, "la política no obliga a decidir per llegir-la");
  check((await ev("localStorage.getItem('espais.avis-cookies')")) === null, "consultar la política no desa el tancament");

  await ev(`document.querySelector("a[href='/']").click()`);
  await waitFor("location.pathname === '/' && !!document.querySelector('#nota-funcio')", "tornada a la landing");

  await ev(`document.querySelector("#nota-funcio button").click()`);
  await waitFor("!document.querySelector('#nota-funcio')", "avís tancat");
  check((await ev("localStorage.getItem('espais.avis-cookies')")) === "tancat", "el tancament queda desat");
  check((await cookiesHttp()).length === 0, "després de tancar segueix sense galetes HTTP");

  await send("Page.reload", { ignoreCache: true });
  await waitFor("document.readyState === 'complete' && !!document.querySelector('#contingut')", "recàrrega");
  await sleep(400);
  check((await ev("document.querySelector('#nota-funcio')")) === null, "després de recarregar l’avís no torna");
  check((await ev("localStorage.getItem('espais.avis-cookies')")) === "tancat", "la visita posterior conserva el tancament");

  await ev("localStorage.removeItem('espais.avis-cookies')");
  await comprovarMida(1280, 800, "escriptori");
} catch (err) {
  passos.push(`ATURAT ${err.message}`);
  codi = 1;
} finally {
  console.log(passos.join("\n"));
  ws?.close();
  proc.kill();
  await sleep(500);
  rmSync(perfil, { recursive: true, force: true });
  process.exit(codi);
}
