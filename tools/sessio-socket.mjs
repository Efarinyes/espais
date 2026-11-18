import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../frontend/package.json"));
const { io } = require("socket.io-client");

function espera(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(event)), 8000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
    socket.once("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Login complet per als scripts E2E. El codi només arriba pel socket d’aquesta crida. */
export async function iniciaSessio(appUrl, email, password) {
  const origen = new URL(appUrl).origin;
  const api = `${origen}/api`;
  const socket = io(origen, {
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
    timeout: 8000,
  });
  try {
    const canal = await espera(socket, "verificacio:canal");
    const codiPendent = espera(socket, "verificacio:codi");
    const inici = await fetch(`${api}/sessio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, channel: canal.channel }),
    });
    const iniciJson = await inici.json().catch(() => null);
    if (inici.status !== 200) {
      codiPendent.catch(() => undefined);
      return { status: inici.status, body: iniciJson, json: iniciJson };
    }
    const codi = await codiPendent;
    const verificat = await fetch(`${api}/sessio/verificacio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: iniciJson.challenge_id,
        code: codi.code,
        channel: canal.channel,
      }),
    });
    const json = await verificat.json().catch(() => null);
    return { status: verificat.status, body: json, json };
  } finally {
    socket.disconnect();
  }
}
