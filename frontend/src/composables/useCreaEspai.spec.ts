import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useCreaEspai } from "./useCreaEspai";
import { ApiError } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { useSessioStore } from "../stores/sessio";

function muntar(api: Partial<EspaisApi>) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "t",
    entity_id: "e1",
    user_id: "u1",
    role: "responsible",
    entity_name: "AAVV",
    user_name: "Anna",
    typology: null,
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/espais", name: "espais", component: { template: "<div>llista</div>" } },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
    ],
  });
  const Host = defineComponent({
    setup: () => useCreaEspai(),
    template: "<div />",
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [espaisApiKey as symbol]: {
          llistar: async () => [],
          crear: async () => ({
            id: "s1",
            entity_id: "e1",
            name: "Sala 1",
            capacity: 20,
            equipment: null,
            active: true,
          }),
          ...api,
        } satisfies EspaisApi,
      },
    },
  });
  return { wrapper, router };
}

describe("useCreaEspai", () => {
  it("després de crear navega a la llista d’espais", async () => {
    const { wrapper, router } = muntar({});
    await router.push("/espais/nou");
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "40";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("mostra error si el nom ja existeix a l’entitat", async () => {
    const { wrapper } = muntar({
      crear: async () => {
        throw new ApiError("duplicat", 409);
      },
    });
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("ja existeix");
  });
});
