import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useCreaEspai } from "./useCreaEspai";
import { ApiError } from "../services/http";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
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
          obtenir: async () => ({
            id: "s1",
            entity_id: "e1",
            name: "Sala 1",
            capacity: 20,
            equipment: null,
            active: true,
            windows: finestresPerDefecte(),
          }),
          crear: async () => ({
            id: "s1",
            entity_id: "e1",
            name: "Sala 1",
            capacity: 20,
            equipment: null,
            active: true,
            windows: finestresPerDefecte(),
          }),
          actualitzar: async () => ({
            id: "s1",
            entity_id: "e1",
            name: "Sala 1",
            capacity: 20,
            equipment: null,
            active: true,
            windows: finestresPerDefecte(),
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

  it("es queda al formulari si desar retorna un error 500", async () => {
    const { wrapper, router } = muntar({
      crear: async () => {
        throw new ApiError("no s’ha pogut desar", 500);
      },
    });
    await router.push("/espais/nou");
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("espai-nou");
    expect(wrapper.vm.errorGlobal).toContain("no s’ha pogut desar");
  });

  it("envia les finestres per defecte en crear", async () => {
    let enviat: { windows?: { weekday: number }[] } | undefined;
    const { wrapper, router } = muntar({
      crear: async (_token, input) => {
        enviat = input;
        return {
          id: "s1",
          entity_id: "e1",
          name: "Sala 1",
          capacity: 10,
          equipment: null,
          active: true,
          windows: finestresPerDefecte(),
        };
      },
    });
    await router.push("/espais/nou");
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(enviat?.windows).toHaveLength(7);
  });

  it("no envia si no hi ha cap dia actiu", async () => {
    let cridat = false;
    const { wrapper } = muntar({
      crear: async () => {
        cridat = true;
        throw new Error("no s’hauria de cridar");
      },
    });
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    wrapper.vm.dies.forEach((dia: { actiu: boolean }) => {
      dia.actiu = false;
    });
    await wrapper.vm.enviar();
    await flushPromises();
    expect(cridat).toBe(false);
    expect(wrapper.vm.errorsCamp.windows).toContain("almenys un dia");
  });

  it("mostra error clar si el coordinador no té permís", async () => {
    const { wrapper } = muntar({
      crear: async () => {
        throw new ApiError("només el responsable pot definir espais", 403);
      },
    });
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("Només el responsable");
  });
});
