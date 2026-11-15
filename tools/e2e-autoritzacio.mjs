#!/usr/bin/env node
// E2E d’autorització contra una pila Docker local (docs/13-testing.md).
// Comprova l’accés directe a les rutes i les crides a l’API. No imprimeix tokens.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.env.ESPAIS_E2E_APP ?? "http://127.0.0.1:8090";
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

const API = `${APP}/api`;
const PORT = 9342;
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
  const resultat = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (resultat.exceptionDetails) throw new Error(`eval: ${resultat.exceptionDetails.text}`);
  return resultat.result.value;
}

async function waitFor(expression, label, timeout = 15000) {
  const final = Date.now() + timeout;
  while (Date.now() < final) {
    try {
      if (await ev(expression)) return;
    } catch {
      /* la pàgina encara navega */
    }
    await sleep(100);
  }
  const estat = await ev(`(() => {
    let role = "";
    try { role = JSON.parse(localStorage.getItem("espais.sessio") || "null")?.role || ""; } catch { role = "json"; }
    return JSON.stringify({
      path: location.pathname,
      h1: document.querySelector("h1")?.innerText ?? "",
      text: (document.body?.innerText ?? "").slice(0, 240),
      role,
    });
  })()`).catch((err) => String(err));
  throw new Error(`temps exhaurit: ${label} ${estat}`);
}

async function go(url) {
  await send("Page.navigate", { url });
  await sleep(200);
  await waitFor("document.readyState === 'complete' && !!document.querySelector('#contingut')", "càrrega");
}

async function h1() {
  return ev("document.querySelector('h1')?.innerText ?? ''");
}

async function esperarH1(fragment, etiqueta) {
  const literal = JSON.stringify(fragment);
  await waitFor(`(document.querySelector('h1')?.innerText ?? '').includes(${literal})`, etiqueta);
}

function sessioNavegador(vista, role = vista.role) {
  return {
    token: vista.token,
    entityId: vista.entity_id,
    entityName: vista.entity_name,
    userName: vista.user_name,
    role,
    typology: vista.typology ?? null,
    palette: vista.palette ?? "mar-cel",
  };
}

async function entrar(vista, role, path) {
  await go(`${APP}/politica-de-cookies`);
  const json = JSON.stringify(sessioNavegador(vista, role));
  await ev(`localStorage.setItem('espais.sessio', ${JSON.stringify(json)})`);
  await go(`${APP}${path}`);
}

async function api(path, opcions = {}) {
  const headers = { ...(opcions.headers ?? {}) };
  if (opcions.token) headers.Authorization = `Bearer ${opcions.token}`;
  if (opcions.body) headers["Content-Type"] = "application/json";
  const resposta = await fetch(`${API}${path}`, {
    method: opcions.method ?? "GET",
    headers,
    body: opcions.body ? JSON.stringify(opcions.body) : undefined,
  });
  const text = await resposta.text();
  return { status: resposta.status, json: text ? JSON.parse(text) : null };
}

const perfil = mkdtempSync(join(tmpdir(), "espais-e2e-autoritzacio-"));
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
    const pendent = pendents.get(msg.id);
    pendents.delete(msg.id);
    if (msg.error) pendent.reject(new Error(msg.error.message));
    else pendent.resolve(msg.result);
  });
  await send("Page.enable");
  await send("Runtime.enable");

  const senseSessio = await api("/analisi?des=2026-09-01T00:00:00%2B02:00&fins=2026-10-01T00:00:00%2B02:00");
  check(senseSessio.status === 401, "API: anàlisi sense sessió respon 401");
  const espaisSense = await api("/espais");
  check(espaisSense.status === 401, "API: espais sense sessió respon 401");

  const responsable = await api("/registre", {
    method: "POST",
    body: {
      entity_name: "Entitat Autorització",
      typology: "associació de veïns",
      responsible_name: "Rita",
      email: "e2e.autoritzacio.resp@example.com",
      password: "secret123",
    },
  });
  check(responsable.status === 201 && responsable.json.role === "responsible", "API: alta del responsable");
  const espai = await api("/espais", {
    method: "POST",
    token: responsable.json.token,
    body: { name: "Sala 1", capacity: 10 },
  });
  check(espai.status === 201, "API: el responsable crea un espai");
  const invitacio = await api("/invitacions", {
    method: "POST",
    token: responsable.json.token,
    body: { email: "e2e.autoritzacio.coord@example.com" },
  });
  check(invitacio.status === 201, "API: el responsable convida");
  const tokenInvitacio = String(invitacio.json.accept_url).split("/").pop();
  const coordinador = await api(`/invitacions/${tokenInvitacio}/acceptar`, {
    method: "POST",
    body: { name: "Cora", password: "secret123" },
  });
  check(coordinador.status === 201 && coordinador.json.role === "coordinator", "API: el coordinador accepta");

  const analisiCoord = await api(
    "/analisi?des=2026-09-01T00:00:00%2B02:00&fins=2026-10-01T00:00:00%2B02:00",
    { token: coordinador.json.token },
  );
  check(analisiCoord.status === 403, "API: el coordinador no llegeix l’anàlisi");
  const avisosResp = await api("/avisos", { token: responsable.json.token });
  check(avisosResp.status === 403, "API: el responsable no llegeix els avisos");
  const espaisCoord = await api("/espais", { token: coordinador.json.token });
  check(espaisCoord.status === 200, "API: el coordinador llegeix els espais");
  const crearCoord = await api("/espais", {
    method: "POST",
    token: coordinador.json.token,
    body: { name: "Sala aliena", capacity: 4, role: "responsible" },
  });
  check(crearCoord.status === 403, "API: un camp role al cos no dona permís");

  await go(`${APP}/analisi`);
  await esperarH1("Inicia sessió", "sense sessió, /analisi");
  check((await ev("location.pathname")) === "/iniciar-sessio", "sense sessió, la URL és iniciar sessió");
  check(!(await h1()).includes("Estadístiques"), "sense sessió, no es veuen les estadístiques");

  await go(`${APP}/politica-de-cookies`);
  await esperarH1("Política de cookies", "política pública");
  check((await ev("location.pathname")) === "/politica-de-cookies", "la política es queda oberta");

  await entrar(responsable.json, "coordinator", "/analisi");
  await esperarH1("Estadístiques", "el rol del servidor mana");
  check((await ev("location.pathname")) === "/analisi", "el responsable entra a estadístiques");
  check((await ev("document.body.innerText")).includes("Estadístiques"), "es veu el títol d’estadístiques");

  await entrar(responsable.json, "responsible", "/avisos");
  await esperarH1("Espais de", "el responsable no entra a avisos");
  check((await ev("location.pathname")) === "/espais", "el responsable torna als espais");
  check(!(await h1()).includes("Avisos"), "no es mostra la safata");

  await entrar(responsable.json, "responsible", "/calendari");
  await esperarH1("Totes les reserves", "el responsable entra al calendari");
  check((await ev("location.pathname")) === "/calendari", "la URL del calendari es manté");

  await entrar(coordinador.json, "responsible", "/avisos");
  await esperarH1("Avisos", "el coordinador entra a la safata");
  check((await ev("location.pathname")) === "/avisos", "la URL d’avisos es manté");

  await entrar(coordinador.json, "coordinator", "/analisi");
  await esperarH1("Espais de", "el coordinador no entra a estadístiques");
  check((await ev("location.pathname")) === "/espais", "el coordinador torna als espais");
  check(!(await h1()).includes("Estadístiques"), "no es mostren les estadístiques");

  await entrar(coordinador.json, "coordinator", "/calendari");
  await esperarH1("Les meves reserves", "el coordinador entra al calendari");
  check((await ev("location.pathname")) === "/calendari", "el calendari compartit es manté");

  await entrar(coordinador.json, "coordinator", "/espais/nou");
  await esperarH1("Espais de", "el coordinador no entra a crear un espai");
  check((await ev("location.pathname")) === "/espais", "crear un espai el torna als espais");

  const tancament = await api("/sessio/tancament", { method: "POST", token: coordinador.json.token });
  check(tancament.status === 204, "API: tancar la sessió");
  const morta = await api("/espais", { token: coordinador.json.token });
  check(morta.status === 401, "API: el token tancat respon 401");
  await entrar(coordinador.json, "coordinator", "/espais");
  await esperarH1("Inicia sessió", "sessió tancada al navegador");
  check((await ev("location.pathname")) === "/iniciar-sessio", "la sessió tancada no obre el tauler");
  check((await ev("localStorage.getItem('espais.sessio')")) === null, "el navegador esborra la sessió morta");
} catch (err) {
  codi = 1;
  console.error(err instanceof Error ? err.message : err);
} finally {
  console.log(passos.join("\n"));
  ws?.close();
  proc.kill();
  await sleep(400);
  rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
process.exit(codi);
