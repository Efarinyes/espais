import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { disparadorCalendariKey, type DisparadorCalendari } from "../calendariLive";
import { useRefrescCalendari } from "./useRefrescCalendari";

function disparadorInterval(ms: number): DisparadorCalendari {
  return {
    iniciar(avisar) {
      const id = window.setInterval(avisar, ms);
      return () => window.clearInterval(id);
    },
  };
}

describe("useRefrescCalendari", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avisa en cada tick si no està pausat", async () => {
    vi.useFakeTimers();
    const avisar = vi.fn();
    const Host = defineComponent({
      setup: () => useRefrescCalendari(avisar, () => false),
      template: "<div />",
    });
    const wrapper = mount(Host, {
      global: { provide: { [disparadorCalendariKey as symbol]: disparadorInterval(20_000) } },
    });
    wrapper.vm.engegar();
    vi.advanceTimersByTime(20_000);
    await flushPromises();
    expect(avisar).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("no avisa si el modal és obert", async () => {
    vi.useFakeTimers();
    const avisar = vi.fn();
    const Host = defineComponent({
      setup: () => useRefrescCalendari(avisar, () => true),
      template: "<div />",
    });
    const wrapper = mount(Host, {
      global: { provide: { [disparadorCalendariKey as symbol]: disparadorInterval(20_000) } },
    });
    wrapper.vm.engegar();
    vi.advanceTimersByTime(20_000);
    await flushPromises();
    expect(avisar).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("deixa d’avisar en desmuntar", async () => {
    vi.useFakeTimers();
    const avisar = vi.fn();
    const Host = defineComponent({
      setup: () => useRefrescCalendari(avisar, () => false),
      template: "<div />",
    });
    const wrapper = mount(Host, {
      global: { provide: { [disparadorCalendariKey as symbol]: disparadorInterval(20_000) } },
    });
    wrapper.vm.engegar();
    wrapper.unmount();
    vi.advanceTimersByTime(20_000);
    await flushPromises();
    expect(avisar).not.toHaveBeenCalled();
  });
});
