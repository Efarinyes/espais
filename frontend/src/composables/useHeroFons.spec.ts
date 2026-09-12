import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";

import { INTERVAL_HERO_MS, useHeroFons } from "./useHeroFons";

function muntar(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }) satisfies MediaQueryList,
  );

  const Host = defineComponent({
    setup() {
      return useHeroFons();
    },
    template: "<div />",
  });
  return mount(Host);
}

describe("useHeroFons", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("avança el fons cada interval si no hi ha reducció de moviment", async () => {
    const wrapper = muntar(false);
    expect(wrapper.vm.index).toBe(0);
    await vi.advanceTimersByTimeAsync(INTERVAL_HERO_MS);
    expect(wrapper.vm.index).toBe(1);
    await vi.advanceTimersByTimeAsync(INTERVAL_HERO_MS * 3);
    expect(wrapper.vm.index).toBe(0);
    wrapper.unmount();
  });

  it("no avança si l’usuari atura el fons", async () => {
    const wrapper = muntar(false);
    wrapper.vm.togglePausa();
    await vi.advanceTimersByTimeAsync(INTERVAL_HERO_MS * 2);
    expect(wrapper.vm.index).toBe(0);
    expect(wrapper.vm.pausat).toBe(true);
    wrapper.unmount();
  });

  it("no rota amb prefers-reduced-motion", async () => {
    const wrapper = muntar(true);
    expect(wrapper.vm.reduccio).toBe(true);
    await vi.advanceTimersByTimeAsync(INTERVAL_HERO_MS * 2);
    expect(wrapper.vm.index).toBe(0);
    wrapper.unmount();
  });
});
