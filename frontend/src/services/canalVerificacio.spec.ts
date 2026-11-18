import { describe, expect, it } from "vitest";

import { ConnexioVerificacioError, createCanalVerificacio } from "./canalVerificacio";

type Handler = (data?: unknown) => void;

function socketFals() {
  const handlers = new Map<string, Handler[]>();
  return {
    on(event: string, handler: Handler) {
      const llista = handlers.get(event) ?? [];
      llista.push(handler);
      handlers.set(event, llista);
      return this;
    },
    disconnect() {
      handlers.get("disconnect")?.forEach((handler) => handler());
    },
    emet(event: string, data?: unknown) {
      handlers.get(event)?.forEach((handler) => handler(data));
    },
  };
}

describe("createCanalVerificacio", () => {
  it("el canal arriba per la connexió i el codi queda esperant el repte", async () => {
    const socket = socketFals();
    const canal = createCanalVerificacio(() => socket);
    const pendent = canal.assegurar();
    socket.emet("verificacio:canal", { channel: "canal-a" });
    await expect(pendent).resolves.toBe("canal-a");

    socket.emet("verificacio:codi", {
      challenge_id: "repte-1",
      code: "123456",
      expires_at: "2026-11-18T18:02:00.000Z",
    });
    await expect(canal.esperarCodi("repte-1")).resolves.toMatchObject({ code: "123456" });
  });

  it("un codi d’un altre repte no es lliura i la desconnexió avisa", async () => {
    const socket = socketFals();
    const canal = createCanalVerificacio(() => socket);
    const assegurar = canal.assegurar();
    socket.emet("verificacio:canal", { channel: "canal-b" });
    await assegurar;
    socket.emet("verificacio:codi", { challenge_id: "repte-aliè", code: "999999", expires_at: "" });
    const espera = canal.esperarCodi("repte-meu");
    let tallat = false;
    canal.enDesconnexio(() => {
      tallat = true;
    });
    socket.disconnect();
    await expect(espera).rejects.toBeInstanceOf(ConnexioVerificacioError);
    expect(tallat).toBe(true);
  });

  it("tancar no dispara l’avís de desconnexió", async () => {
    const socket = socketFals();
    const canal = createCanalVerificacio(() => socket);
    const assegurar = canal.assegurar();
    socket.emet("verificacio:canal", { channel: "canal-c" });
    await assegurar;
    let tallat = false;
    canal.enDesconnexio(() => {
      tallat = true;
    });
    canal.tancar();
    expect(tallat).toBe(false);
  });
});
