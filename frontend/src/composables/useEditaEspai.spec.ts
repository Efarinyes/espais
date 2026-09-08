import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useEditaEspai } from "./useEditaEspai";
import { ApiError } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
import { useSessioStore } from "../stores/sessio";

const espai = {
  id: "s1",
  entity_id: "e1",
  name: "Sala 1",
  capacity: 20,
  equipment: "cadires",
  active: true,
  windows: finestresPerDefecte(),
};

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
  const Host = defineComponent({
    setup: () => useEditaEspai(),
    template: "<div />",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/espais/:id", name: "espai-editar", component: Host },
      { path: "/espais", name: "espais", component: { template: "<div>llista</div>" } },
    ],
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [espaisApiKey as symbol]: {
          llistar: async () => [],
          obtenir: async () => espai,
          crear: async () => espai,
          actualitzar: async () => espai,
          ...api,
        } satisfies EspaisApi,
      },
    },
  });
  return { wrapper, router };
}

describe("useEditaEspai", () => {
  it("carrega nom, aforament i equipament de l’espai", async () => {
    const { wrapper, router } = muntar({});
    await router.push("/espais/s1");
    await flushPromises();
    expect(wrapper.vm.camps.name).toBe("Sala 1");
    expect(wrapper.vm.camps.capacity).toBe("20");
    expect(wrapper.vm.camps.equipment).toBe("cadires");
    expect(wrapper.vm.camps.active).toBe(true);
    expect(wrapper.vm.dies.filter((dia: { actiu: boolean }) => dia.actiu)).toHaveLength(7);
    expect(wrapper.vm.trobat).toBe(true);
  });

  it("després de desar navega a la llista d’espais", async () => {
    const { wrapper, router } = muntar({});
    await router.push("/espais/s1");
    await flushPromises();
    await wrapper.vm.enviar();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("mostra error si el nom ja existeix a l’entitat", async () => {
    const { wrapper, router } = muntar({
      actualitzar: async () => {
        throw new ApiError("duplicat", 409);
      },
    });
    await router.push("/espais/s1");
    await flushPromises();
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("ja existeix");
    expect(router.currentRoute.value.name).toBe("espai-editar");
  });
});
