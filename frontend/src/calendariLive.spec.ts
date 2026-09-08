import { afterEach, describe, expect, it, vi } from "vitest";

import { INTERVAL_REFRESC_CALENDARI_MS, createDisparadorPolling } from "./calendariLive";

function visibilitatFalsa(hidden = false) {
  const listeners = new Set<() => void>();
  return {
    hidden,
    addEventListener(_type: "visibilitychange", listener: () => void) {
      listeners.add(listener);
    },
    removeEventListener(_type: "visibilitychange", listener: () => void) {
      listeners.delete(listener);
    },
    avisarVisibilitat() {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

describe("createDisparadorPolling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avisa a cada interval si la pestanya és visible", () => {
    vi.useFakeTimers();
    const visibilitat = visibilitatFalsa(false);
    const avisar = vi.fn();
    const aturar = createDisparadorPolling({
      intervalMs: INTERVAL_REFRESC_CALENDARI_MS,
      visibilitat,
    }).iniciar(avisar);

    expect(avisar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(INTERVAL_REFRESC_CALENDARI_MS);
    expect(avisar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTERVAL_REFRESC_CALENDARI_MS);
    expect(avisar).toHaveBeenCalledTimes(2);
    aturar();
  });

  it("no avisa mentre la pestanya és oculta", () => {
    vi.useFakeTimers();
    const visibilitat = visibilitatFalsa(true);
    const avisar = vi.fn();
    const aturar = createDisparadorPolling({ visibilitat }).iniciar(avisar);

    vi.advanceTimersByTime(INTERVAL_REFRESC_CALENDARI_MS);
    expect(avisar).not.toHaveBeenCalled();
    aturar();
  });

  it("avisa en tornar a la pestanya", () => {
    vi.useFakeTimers();
    const visibilitat = visibilitatFalsa(true);
    const avisar = vi.fn();
    const aturar = createDisparadorPolling({ visibilitat }).iniciar(avisar);

    visibilitat.hidden = false;
    visibilitat.avisarVisibilitat();
    expect(avisar).toHaveBeenCalledTimes(1);
    aturar();
  });

  it("deixa d’avisar després d’aturar", () => {
    vi.useFakeTimers();
    const visibilitat = visibilitatFalsa(false);
    const avisar = vi.fn();
    const aturar = createDisparadorPolling({ visibilitat }).iniciar(avisar);
    aturar();

    vi.advanceTimersByTime(INTERVAL_REFRESC_CALENDARI_MS);
    visibilitat.avisarVisibilitat();
    expect(avisar).not.toHaveBeenCalled();
  });
});
