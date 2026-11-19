import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

type Oient = (event: unknown) => void;

type Notificacio = { titol: string; opcions: Record<string, unknown> };

/** Executa `public/push-sw.js` contra un `self` de mentida: és el mateix text que es carrega al navegador. */
function carregaServiceWorker(finestres: { url: string; focus?: boolean; navegables?: boolean }[]) {
  const oients = new Map<string, Oient>();
  const mostrades: Notificacio[] = [];
  const missatges: unknown[] = [];
  const navegades: string[] = [];
  const enfocades: string[] = [];
  const obertes: string[] = [];
  const clients = finestres.map((finestra) => ({
    url: finestra.url,
    postMessage: (dada: unknown) => missatges.push(dada),
    focus: async () => {
      enfocades.push(finestra.url);
    },
    navigate: async (desti: string) => {
      navegades.push(desti);
    },
  }));
  const jo = {
    location: { origin: "https://espais.example" },
    addEventListener: (tipus: string, oient: Oient) => oients.set(tipus, oient),
    registration: {
      showNotification: async (titol: string, opcions: Record<string, unknown>) => {
        mostrades.push({ titol, opcions });
      },
    },
    clients: {
      matchAll: async () => clients,
      openWindow: async (desti: string) => {
        obertes.push(desti);
      },
    },
  };
  const codi = readFileSync(resolve(process.cwd(), "public/push-sw.js"), "utf8");
  new Function("self", codi)(jo);
  return { oients, mostrades, missatges, navegades, enfocades, obertes };
}

async function dispara(oient: Oient | undefined, event: Record<string, unknown>) {
  let promesa: Promise<unknown> = Promise.resolve();
  oient?.({ ...event, waitUntil: (p: Promise<unknown>) => (promesa = p) });
  await promesa;
}

function push(dades: unknown) {
  return { data: { json: () => dades } };
}

describe("push-sw.js", () => {
  let sw: ReturnType<typeof carregaServiceWorker>;

  beforeEach(() => {
    sw = carregaServiceWorker([{ url: "https://espais.example/calendari" }]);
  });

  it("mostra la notificació amb el títol i el text del backend", async () => {
    await dispara(
      sw.oients.get("push"),
      push({ title: "Reserva anul·lada: Sala 1", body: "Horari original: …", url: "/avisos?avis=n1", tag: "avis-n1" }),
    );
    expect(sw.mostrades).toHaveLength(1);
    expect(sw.mostrades[0].titol).toBe("Reserva anul·lada: Sala 1");
    expect(sw.mostrades[0].opcions).toMatchObject({
      body: "Horari original: …",
      tag: "avis-n1",
      lang: "ca",
      data: { url: "/avisos?avis=n1" },
    });
  });

  it("la mateixa etiqueta substitueix la notificació en comptes de duplicar-la", async () => {
    await dispara(sw.oients.get("push"), push({ title: "a", body: "b", url: "/avisos", tag: "avis-n1" }));
    await dispara(sw.oients.get("push"), push({ title: "a", body: "b", url: "/avisos", tag: "avis-n1" }));
    expect(sw.mostrades.map((item) => item.opcions.tag)).toEqual(["avis-n1", "avis-n1"]);
  });

  it("desperta les pestanyes obertes sense dir que res s’hagi llegit", async () => {
    await dispara(sw.oients.get("push"), push({ title: "a", body: "b", url: "/avisos", tag: "t" }));
    expect(sw.missatges).toEqual([{ type: "espais-push" }]);
  });

  it("un push buit o corrupte mostra una notificació genèrica i no trenca", async () => {
    await dispara(sw.oients.get("push"), { data: null });
    await dispara(sw.oients.get("push"), {
      data: {
        json: () => {
          throw new Error("no és JSON");
        },
      },
    });
    expect(sw.mostrades.map((item) => item.titol)).toEqual(["Espais", "Espais"]);
    expect(sw.mostrades[0].opcions.data).toEqual({ url: "/avisos" });
  });

  it("ignora una URL que no sigui d’Espais", async () => {
    await dispara(sw.oients.get("push"), push({ title: "a", body: "b", url: "https://atacant.example/x" }));
    expect(sw.mostrades[0].opcions.data).toEqual({ url: "/avisos" });
  });

  it("en tocar la notificació, enfoca una finestra d’Espais i la porta a l’avís", async () => {
    let tancada = false;
    await dispara(sw.oients.get("notificationclick"), {
      notification: { close: () => (tancada = true), data: { url: "/avisos?avis=n1" } },
    });
    expect(tancada).toBe(true);
    expect(sw.enfocades).toEqual(["https://espais.example/calendari"]);
    expect(sw.navegades).toEqual(["/avisos?avis=n1"]);
    expect(sw.obertes).toEqual([]);
  });

  it("si Espais no és obert, obre una finestra nova a l’avís", async () => {
    sw = carregaServiceWorker([]);
    await dispara(sw.oients.get("notificationclick"), {
      notification: { close: () => undefined, data: { url: "/avisos?avis=n1" } },
    });
    expect(sw.obertes).toEqual(["/avisos?avis=n1"]);
  });

  it("no enfoca finestres d’altres orígens", async () => {
    sw = carregaServiceWorker([{ url: "https://altre.example/" }]);
    await dispara(sw.oients.get("notificationclick"), {
      notification: { close: () => undefined, data: { url: "/avisos" } },
    });
    expect(sw.enfocades).toEqual([]);
    expect(sw.obertes).toEqual(["/avisos"]);
  });
});
