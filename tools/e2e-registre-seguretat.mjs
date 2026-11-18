#!/usr/bin/env node
// Un correu que ja té compte no rep un altre enllaç de registre.
// Contra una pila Docker local amb Mailpit. No imprimeix tokens.
import { correuDeVerificacio } from "./verificar-alta.mjs";
import { iniciaSessio } from "./sessio-socket.mjs";

const APP = process.env.ESPAIS_E2E_APP ?? "http://127.0.0.1:8090";
const MAILPIT = process.env.ESPAIS_E2E_MAILPIT ?? "http://127.0.0.1:18025";
const SUFIX = Date.now().toString(36);
const PASSWORD = "secret123";

if (!["localhost", "127.0.0.1"].includes(new URL(APP).hostname)) {
  console.error(`Només contra una pila local: ${APP} no ho és.`);
  process.exit(2);
}

const passos = [];
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
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function nombreCorreus(email, assumpte) {
  const query = encodeURIComponent(`to:${email}`);
  const llista = await (await fetch(`${MAILPIT}/api/v1/search?query=${query}&limit=50`)).json();
  return (llista.messages ?? []).filter((m) => String(m.Subject).startsWith(assumpte)).length;
}

async function alta(email, entitat, nom) {
  return api("POST", "/registre", {
    entity_name: entitat,
    typology: "associació",
    responsible_name: nom,
    email,
    password: PASSWORD,
  });
}

let codi = 0;
try {
  const volei = `volei.${SUFIX}@example.com`;
  const altre = `esbart.${SUFIX}@example.com`;
  const primera = await alta(volei, `Entitat ${SUFIX}`, "Anna");
  check(primera.status === 201 && primera.body.lliurament === "sent" && !primera.body.token, "l’alta nova respon 201 i no obre sessió");
  const enllac = await correuDeVerificacio(MAILPIT, volei);
  check(Boolean(enllac?.token), "el compte nou rep un sol correu de verificació");
  check((await nombreCorreus(volei, "Verifica el correu")) === 1, "només hi ha un correu de registre per al compte nou");

  const repetit = await alta(volei, `Altra ${SUFIX}`, "Altra");
  check(repetit.status === 400 && !String(repetit.body.detail).includes("registrat"), "el segon registre es rebutja sense dir que el correu existeix");
  check((await nombreCorreus(volei, "Verifica el correu")) === 1, "un correu que ja té compte no rep un altre enllaç");

  const bloquejat = await api("POST", "/sessio", { email: volei, password: PASSWORD });
  check(bloquejat.status === 403, "abans de verificar no es pot entrar");
  const dolenta = await api("POST", "/sessio", { email: volei, password: "equivocada" });
  check(dolenta.status === 401, "una contrasenya incorrecta continua sent 401");

  const confirmat = await api("POST", "/registre/verificacio/confirmacio", { token: enllac.token });
  check(confirmat.status === 200 && !confirmat.body.token, "verificar el correu no obre sessió");
  const usat = await api("POST", "/registre/verificacio/confirmacio", { token: enllac.token });
  check(usat.status === 410, "l’enllaç de verificació només val una vegada");
  const sessio = await iniciaSessio(APP, volei, PASSWORD);
  check(sessio.status === 200 && sessio.body.role === "responsible", "després de verificar es pot entrar");
  check((await nombreCorreus(volei, "Verifica el correu")) === 1, "un compte ja verificat tampoc no rep un enllaç de registre");
  const jaActiu = await alta(volei, `Tercera ${SUFIX}`, "Tercera");
  check(jaActiu.status === 400, "el registre d’un compte verificat es rebutja");
  check((await nombreCorreus(volei, "Verifica el correu")) === 1, "el rebuig no envia cap correu");

  const segona = await alta(altre, `Esbart ${SUFIX}`, "Berta");
  check(segona.status === 201, "una altra adreça nova es pot registrar");
  check((await nombreCorreus(altre, "Verifica el correu")) === 1, "el correu nou només arriba a l’adreça nova");
  check((await nombreCorreus(volei, "Verifica el correu")) === 1, "registrar una altra entitat no escriu a un compte existent");

  const enllacAltre = await correuDeVerificacio(MAILPIT, altre);
  await api("POST", "/registre/verificacio/confirmacio", { token: enllacAltre.token });
  const sessioAltre = await iniciaSessio(APP, altre, PASSWORD);
  const espai = await api("POST", "/espais", { name: "Sala 1", capacity: 12 }, sessioAltre.body.token);
  check(espai.status === 201, "el responsable verificat crea un espai");
  const invitacio = await api("POST", "/invitacions", { email: `coord.${SUFIX}@example.com` }, sessioAltre.body.token);
  check(invitacio.status === 201, "el responsable convida un coordinador");
  const acceptat = await api("POST", `/invitacions/${invitacio.body.accept_url.split("/").pop()}/acceptar`, {
    name: "Cora",
    password: PASSWORD,
  });
  check(acceptat.status === 201 && acceptat.body.role === "coordinator", "el coordinador entra per la invitació, sense el registre");
  check((await nombreCorreus(`coord.${SUFIX}@example.com`, "Verifica el correu")) === 0, "el coordinador no rep el correu de registre de responsable");
} catch (err) {
  codi = 1;
  console.error(err instanceof Error ? err.message : err);
} finally {
  console.log(passos.join("\n"));
}
process.exit(codi);
