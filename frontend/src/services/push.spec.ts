import { afterEach, describe, expect, it, vi } from "vitest";

import { clauPublicaABytes, createNavegadorPush, createPushApi } from "./push";

describe("clauPublicaABytes", () => {
  it("converteix una clau base64url a bytes", () => {
    expect([...clauPublicaABytes("AQID")]).toEqual([1, 2, 3]);
    expect([...clauPublicaABytes("-_8")]).toEqual([251, 255]);
  });

  it("una clau pública VAPID fa 65 bytes", () => {
    const clau = "BCzzrubVPY2Uh1AMvB7ihRLTCMCLh6SEWdxC9NDwZfz7X1MT6pvoB4q07gHnOg9j5ZqIGvdiyQ_8PHeyIRzSHiU";
    expect(clauPublicaABytes(clau)).toHaveLength(65);
  });
});

describe("createPushApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parla amb els endpoints de push amb el token de sessió", async () => {
    const crides: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        crides.push({ url, init });
        if (url.endsWith("/push/configuracio")) {
          return new Response(JSON.stringify({ enabled: true, public_key: "K" }), { status: 200 });
        }
        return new Response(null, { status: 204 });
      }),
    );
    const api = createPushApi("/api");
    expect(await api.configuracio("tok")).toEqual({ enabled: true, public_key: "K" });
    await api.registrar("tok", { endpoint: "https://x", keys: { p256dh: "p", auth: "a" } });
    await api.cancelar("tok", "https://x");

    expect(crides.map((crida) => [crida.init.method ?? "GET", crida.url])).toEqual([
      ["GET", "/api/push/configuracio"],
      ["PUT", "/api/push/subscripcio"],
      ["POST", "/api/push/subscripcio/cancelacio"],
    ]);
    expect(JSON.parse(crides[1].init.body as string)).toEqual({
      endpoint: "https://x",
      keys: { p256dh: "p", auth: "a" },
    });
    expect(JSON.parse(crides[2].init.body as string)).toEqual({ endpoint: "https://x" });
    for (const crida of crides) {
      expect(new Headers(crida.init.headers).get("Authorization")).toBe("Bearer tok");
    }
  });
});

describe("createNavegadorPush().suport", () => {
  const original = {
    agent: navigator.userAgent,
    touch: navigator.maxTouchPoints,
  };

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: original.agent, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: original.touch, configurable: true });
    delete (navigator as unknown as Record<string, unknown>).standalone;
    vi.unstubAllGlobals();
  });

  it("jsdom no té Service Worker ni PushManager: no és compatible", () => {
    expect(createNavegadorPush().suport()).toBe("no-suportat");
  });

  it("a un iPhone dins del navegador cal instal·lar l’app", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    expect(createNavegadorPush().suport()).toBe("cal-instalar");
  });

  it("un iPad que es presenta com a Mac, amb pantalla tàctil, també cal instal·lar-lo", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    expect(createNavegadorPush().suport()).toBe("cal-instalar");
  });

  it("un iPhone amb l’app a la pantalla d’inici sense APIs de push no es presenta com a pendent d’instal·lar", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    (navigator as unknown as { standalone: boolean }).standalone = true;
    expect(createNavegadorPush().suport()).toBe("no-suportat");
  });

  it("amb Service Worker, PushManager i Notification és compatible", () => {
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("Notification", class {});
    try {
      expect(createNavegadorPush().suport()).toBe("suportat");
    } finally {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    }
  });
});
