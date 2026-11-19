import type { InjectionKey } from "vue";

import { fetchApi } from "./http";

export type PushConfigDto = { enabled: boolean; public_key: string | null };

export type SubscripcioPush = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Backend: configuració pública VAPID i subscripcions del coordinador. */
export type PushApi = {
  configuracio(token: string): Promise<PushConfigDto>;
  registrar(token: string, subscripcio: SubscripcioPush): Promise<void>;
  cancelar(token: string, endpoint: string): Promise<void>;
};

export const pushApiKey: InjectionKey<PushApi> = Symbol("pushApi");

export function createPushApi(baseUrl = ""): PushApi {
  return {
    async configuracio(token) {
      return fetchApi<PushConfigDto>(`${baseUrl}/push/configuracio`, { token });
    },
    async registrar(token, subscripcio) {
      await fetchApi<void>(`${baseUrl}/push/subscripcio`, {
        method: "PUT",
        token,
        body: JSON.stringify(subscripcio),
      });
    },
    async cancelar(token, endpoint) {
      await fetchApi<void>(`${baseUrl}/push/subscripcio/cancelacio`, {
        method: "POST",
        token,
        body: JSON.stringify({ endpoint }),
      });
    },
  };
}

export type SuportPush = "suportat" | "no-suportat" | "cal-instalar";
export type PermisPush = "default" | "granted" | "denied";

/**
 * Port de les APIs del navegador (Service Worker, Push, Notification).
 * Es pot substituir en tests; l’adaptador real és `createNavegadorPush`.
 */
export type NavegadorPush = {
  suport(): SuportPush;
  permis(): PermisPush;
  demanarPermis(): Promise<PermisPush>;
  subscripcioActual(): Promise<SubscripcioPush | null>;
  subscriure(clauPublica: string): Promise<SubscripcioPush>;
  /** Cancel·la la subscripció del navegador i torna l’endpoint, o `null` si no n’hi havia. */
  cancelar(): Promise<string | null>;
};

export const navegadorPushKey: InjectionKey<NavegadorPush> = Symbol("navegadorPush");

export function clauPublicaABytes(clau: string): Uint8Array<ArrayBuffer> {
  const base64 = clau.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(clau.length / 4) * 4, "=");
  const text = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

function esDispositiuApple(): boolean {
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
}

function esAppInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

function aSubscripcio(subscripcio: PushSubscription): SubscripcioPush {
  const dades = subscripcio.toJSON();
  const p256dh = dades.keys?.p256dh;
  const auth = dades.keys?.auth;
  if (!dades.endpoint || !p256dh || !auth) {
    throw new Error("subscripció de push incompleta");
  }
  return { endpoint: dades.endpoint, keys: { p256dh, auth } };
}

export function createNavegadorPush(): NavegadorPush {
  async function gestor(): Promise<PushManager> {
    const registre = await navigator.serviceWorker.ready;
    return registre.pushManager;
  }

  return {
    suport() {
      const ambApis =
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator &&
        typeof window !== "undefined" &&
        "PushManager" in window &&
        "Notification" in window;
      if (ambApis) {
        return "suportat";
      }
      // A iOS i iPadOS el push només existeix dins d’una app afegida a la pantalla d’inici.
      if (typeof navigator !== "undefined" && esDispositiuApple() && !esAppInstalada()) {
        return "cal-instalar";
      }
      return "no-suportat";
    },

    permis() {
      return Notification.permission;
    },

    async demanarPermis() {
      return Notification.requestPermission();
    },

    async subscripcioActual() {
      const actual = await (await gestor()).getSubscription();
      return actual ? aSubscripcio(actual) : null;
    },

    async subscriure(clauPublica) {
      const push = await gestor();
      const opcions = { userVisibleOnly: true, applicationServerKey: clauPublicaABytes(clauPublica) };
      try {
        return aSubscripcio(await push.subscribe(opcions));
      } catch (err) {
        // Una subscripció d’una clau VAPID anterior impedeix crear-ne una de nova.
        const antiga = await push.getSubscription();
        if (!antiga) {
          throw err;
        }
        await antiga.unsubscribe();
        return aSubscripcio(await push.subscribe(opcions));
      }
    },

    async cancelar() {
      const actual = await (await gestor()).getSubscription();
      if (!actual) {
        return null;
      }
      const endpoint = actual.endpoint;
      await actual.unsubscribe();
      return endpoint;
    },
  };
}
