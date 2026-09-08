import { inject, type InjectionKey } from "vue";

/**
 * Port del disparador de refetch del calendari.
 * v1: polling HTTP. Un adaptador SSE/WebSocket futur implementa la mateixa interfície
 * i només crida `avisar()`; el calendari no canvia (ADR 0007).
 */
export type DisparadorCalendari = {
  iniciar(avisar: () => void): () => void;
};

export type DocumentVisibilitat = {
  hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

export const INTERVAL_REFRESC_CALENDARI_MS = 20_000;

export const disparadorCalendariKey: InjectionKey<DisparadorCalendari> = Symbol("disparadorCalendari");

export function createDisparadorPolling(opcions?: {
  intervalMs?: number;
  visibilitat?: DocumentVisibilitat;
}): DisparadorCalendari {
  const intervalMs = opcions?.intervalMs ?? INTERVAL_REFRESC_CALENDARI_MS;
  const visibilitat =
    opcions?.visibilitat ?? (typeof document !== "undefined" ? document : undefined);

  return {
    iniciar(avisar) {
      const tick = () => {
        if (visibilitat?.hidden) {
          return;
        }
        avisar();
      };
      const id = window.setInterval(tick, intervalMs);
      const onVisibilitat = () => {
        if (!visibilitat?.hidden) {
          avisar();
        }
      };
      visibilitat?.addEventListener("visibilitychange", onVisibilitat);
      return () => {
        window.clearInterval(id);
        visibilitat?.removeEventListener("visibilitychange", onVisibilitat);
      };
    },
  };
}

export function requireDisparadorCalendari(): DisparadorCalendari {
  return inject(disparadorCalendariKey) ?? createDisparadorPolling();
}
