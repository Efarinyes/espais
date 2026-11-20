#!/usr/bin/env node
// E2E d’avisos de modificació i anul·lació, i de subscripcions Web Push, contra una pila
// local (Docker amb tools/compose.e2e-notificacions.yaml, o uvicorn + vite amb un Mailpit
// a ESPAIS_E2E_MAILPIT). Cal ESPAIS_VAPID_PRIVATE_KEY al backend (tools/generar-claus-vapid.py).
// Veure docs/13-testing.md. No imprimeix tokens, claus ni endpoints.
//
// Cobreix, per HTTP i amb el correu de verificació real a Mailpit:
//   A. el responsable modifica una reserva: avís, lectura, bloqueig del coordinador;
//   B. el responsable anul·la: avís, registre històric, bloqueig;
//   C. una franja alliberada admet una reserva nova i independent;
//   D. subscripcions push: configuració pública, alta, baixa, validació i que un servei
//      de push inaccessible no trenca la modificació ni l’avís dins d’Espais.
// NO verifica l’arribada d’una notificació a un dispositiu real ni al Service Worker d’un
// navegador: això es prova a mà (docs/17-desplegament-docker.md, «Verificació manual»).
import { correuDeVerificacio } from "./verificar-alta.mjs";
import { iniciaSessio } from "./sessio-socket.mjs";

const APP = process.env.ESPAIS_E2E_APP ?? "http://127.0.0.1:8091";
const MAILPIT = process.env.ESPAIS_E2E_MAILPIT ?? "http://127.0.0.1:18026";
if (!["localhost", "127.0.0.1"].includes(new URL(APP).hostname)) {
  console.error(`Només contra una pila local: ${APP} no ho és.`);
  process.exit(2);
}

const API = `${APP}/api`;
const sufix = Date.now().toString(36);
const PASSWORD = "secret123";
const passos = [];

function check(condicio, descripcio) {
  passos.push(`${condicio ? "OK   " : "FALLA"} ${descripcio}`);
  if (!condicio) throw new Error(`ha fallat: ${descripcio}`);
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
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
  return { status: res.status, json };
}

async function alta(nomEntitat, email) {
  const registre = await api("/registre", {
    method: "POST",
    body: {
      entity_name: nomEntitat,
      typology: "associació de veïns",
      responsible_name: "Rita",
      email,
      password: PASSWORD,
    },
  });
  check(registre.status === 201, `${nomEntitat}: alta del responsable`);
  const verificacio = await correuDeVerificacio(MAILPIT, email);
  check(Boolean(verificacio?.token), `${nomEntitat}: arriba el correu de verificació`);
  const confirmat = await api("/registre/verificacio/confirmacio", {
    method: "POST",
    body: { token: verificacio.token },
  });
  check(confirmat.status === 200, `${nomEntitat}: el correu queda verificat`);
  const sessio = await iniciaSessio(APP, email, PASSWORD);
  check(sessio.status === 200, `${nomEntitat}: el responsable entra`);
  return sessio.json.token;
}

async function convida(tokenResponsable, email, nom) {
  const invitacio = await api("/invitacions", { method: "POST", token: tokenResponsable, body: { email } });
  check(invitacio.status === 201, `convida ${nom}`);
  const token = String(invitacio.json.accept_url).split("/").pop();
  const acceptat = await api(`/invitacions/${token}/acceptar`, { method: "POST", body: { name: nom, password: PASSWORD } });
  check(acceptat.status === 201, `${nom} accepta la invitació`);
  return acceptat.json.token;
}

const franja = (dia, hora) => {
  const inici = new Date(Date.UTC(2027, 2, dia, hora - 1, 0, 0));
  return { starts_at: inici.toISOString(), ends_at: new Date(inici.getTime() + 3600_000).toISOString() };
};
const llistar = (token) =>
  api("/reserves?des=2027-03-01T00:00:00%2B01:00&fins=2027-03-31T00:00:00%2B02:00", { token });

try {
  const resp = await alta(`Entitat Avisos ${sufix}`, `e2e.avisos.${sufix}@example.com`);
  const espai = await api("/espais", { method: "POST", token: resp, body: { name: "Sala 1", capacity: 20 } });
  check(espai.status === 201, "el responsable crea l’espai");
  const carla = await convida(resp, `e2e.carla.${sufix}@example.com`, "Carla");
  const oriol = await convida(resp, `e2e.oriol.${sufix}@example.com`, "Oriol");
  const spaceId = espai.json.id;
  const reserva = async (token, dia, hora) => {
    const res = await api("/reserves", { method: "POST", token, body: { space_id: spaceId, ...franja(dia, hora) } });
    check(res.status === 201, `reserva creada (${dia}/3 ${hora}h)`);
    return res.json.id;
  };

  // D (part 1): configuració i subscripcions.
  const config = await api("/push/configuracio", { token: carla });
  check(config.status === 200 && config.json.enabled === true, "D: el servidor té Web Push configurat");
  check(/^[A-Za-z0-9_-]{87}$/.test(config.json.public_key), "D: la clau pública VAPID té el format d’una clau P-256");
  check((await api("/push/configuracio", { token: resp })).status === 403, "D: el responsable no gestiona push");
  check((await api("/push/configuracio")).status === 401, "D: sense sessió, 401");
  const endpointFals = "https://fcm.googleapis.com/fcm/send/e2e-" + sufix;
  const subscripcio = { endpoint: endpointFals, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
  check((await api("/push/subscripcio", { method: "PUT", token: carla, body: subscripcio })).status === 204, "D: Carla registra el seu navegador");
  check(
    (await api("/push/subscripcio", { method: "PUT", token: carla, body: { ...subscripcio, endpoint: "http://127.0.0.1/x" } })).status === 400,
    "D: un endpoint intern es rebutja",
  );
  check((await api("/push/subscripcio", { method: "PUT", token: resp, body: subscripcio })).status === 403, "D: el responsable no es subscriu");

  // A. Modificació.
  const r1 = await reserva(carla, 8, 10);
  const mogut = await api(`/reserves/${r1}/reprogramacio`, {
    method: "POST",
    token: resp,
    body: { ...franja(8, 12), reason: "acte municipal" },
  });
  check(mogut.status === 200, "A: el responsable modifica la reserva (el push cap a un endpoint inaccessible no la trenca)");
  check(mogut.json.managed_by_responsible === true, "A: la reserva queda sota control del responsable");
  const avisos = await api("/avisos", { token: carla });
  const avisA = avisos.json.find((item) => item.reservation_id === r1);
  check(avisA?.type === "reservation_rescheduled" && avisA.read_at === null, "A: Carla té un avís de modificació sense llegir");
  check(JSON.stringify(avisA.changes) === JSON.stringify(["start_time", "end_time"]), "A: l’avís diu què ha canviat");
  check((await api("/avisos", { token: oriol })).json.length === 0, "A: Oriol no veu l’avís de Carla");
  check((await api(`/avisos/${avisA.id}/llegit`, { method: "POST", token: oriol })).status === 404, "A: Oriol no pot marcar l’avís de Carla");
  check((await api(`/reserves/${r1}/reprogramacio`, { method: "POST", token: carla, body: franja(8, 15) })).status === 403, "A: Carla no pot tornar a modificar la reserva");
  check((await api(`/reserves/${r1}/anulacio`, { method: "POST", token: carla })).status === 403, "A: Carla no pot anul·lar-la");
  const pendent = (await llistar(resp)).json.find((item) => item.id === r1);
  check(pendent?.notice?.read_at === null, "A: el responsable veu l’avís pendent de lectura");
  const llegit = await api(`/avisos/${avisA.id}/llegit`, { method: "POST", token: carla });
  check(llegit.status === 200 && Boolean(llegit.json.read_at), "A: Carla llegeix l’avís i queda la data de lectura");
  const vist = (await llistar(resp)).json.find((item) => item.id === r1);
  check(vist?.notice?.read_at === llegit.json.read_at, "A: el responsable veu la mateixa data de lectura");
  check((await api(`/reserves/${r1}/assistencia`, { method: "PUT", token: carla, body: { count: 6 } })).status === 200, "A: Carla continua desant les persones previstes");

  // B. Anul·lació.
  const r2 = await reserva(carla, 9, 10);
  const anul = await api(`/reserves/${r2}/anulacio`, { method: "POST", token: resp });
  check(anul.status === 200 && anul.json.status === "cancelled", "B: el responsable anul·la la reserva");
  const avisB = (await api("/avisos", { token: carla })).json.find((item) => item.reservation_id === r2);
  check(avisB?.type === "reservation_cancelled" && avisB.new_starts_at === null, "B: Carla té l’avís d’anul·lació amb l’horari original");
  check((await api(`/reserves/${r2}/reprogramacio`, { method: "POST", token: carla, body: franja(9, 12) })).status === 400, "B: Carla no pot reprogramar-la");
  check((await api(`/reserves/${r2}/anulacio`, { method: "POST", token: carla })).status === 409, "B: Carla no pot tornar a anul·lar-la");
  check((await api(`/reserves/${r2}/assistencia`, { method: "PUT", token: carla, body: { count: 3 } })).status === 400, "B: no es poden desar persones previstes d’una reserva anul·lada");
  check(!(await llistar(resp)).json.some((item) => item.id === r2), "B: la reserva anul·lada ja no surt al calendari");
  const enviats = await api("/avisos/enviats", { token: resp });
  check(enviats.json.some((item) => item.reservation_id === r2 && item.reservation_status === "cancelled"), "B: el responsable la veu als avisos enviats");
  check((await api("/avisos/enviats", { token: carla })).status === 403, "B: el coordinador no veu els avisos enviats");

  // C. Franja alliberada.
  const r3 = await reserva(oriol, 9, 10);
  check(r3 !== r2, "C: una reserva nova ocupa la franja anul·lada, amb un identificador nou");
  check((await api(`/reserves/${r3}/reprogramacio`, { method: "POST", token: oriol, body: franja(9, 12) })).status === 200, "C: la reserva nova es pot modificar amb normalitat");
  check((await api("/avisos", { token: oriol })).json.length === 0, "C: Oriol, que canvia la seva reserva, no rep avisos");

  // D (part 2): baixa.
  check((await api("/push/subscripcio/cancelacio", { method: "POST", token: carla, body: { endpoint: endpointFals } })).status === 204, "D: Carla dona de baixa el navegador");
  check((await api("/push/subscripcio/cancelacio", { method: "POST", token: carla, body: { endpoint: endpointFals } })).status === 204, "D: donar de baixa dues vegades no falla");
} catch (error) {
  console.error(passos.join("\n"));
  console.error(String(error.message ?? error));
  process.exit(1);
}
console.log(passos.join("\n"));
console.log(`\n${passos.length} comprovacions correctes.`);
