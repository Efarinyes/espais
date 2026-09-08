import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import RegistreView from "./RegistreView.vue";

const sessioBuida: SessioDto = {
  token: "",
  entity_id: "",
  user_id: "",
  role: "responsible",
  entity_name: "",
  user_name: "",
  typology: null,
};

const api: IdentityApi = {
  registrar: async () => sessioBuida,
  iniciarSessio: async () => sessioBuida,
  obtenirSessio: async () => sessioBuida,
};

describe("RegistreView", () => {
  it("mostra les etiquetes del formulari en català", async () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/registre", component: RegistreView },
        { path: "/iniciar-sessio", component: { template: "<div />" } },
      ],
    });
    await router.push("/registre");
    const wrapper = mount(RegistreView, {
      global: {
        plugins: [pinia, router],
        provide: { [identityApiKey as symbol]: api },
      },
    });
    expect(wrapper.text()).toContain("Nom de l’entitat");
    expect(wrapper.text()).toContain("Nom del responsable");
    expect(wrapper.get("label[for='entity_name']").text()).toContain("entitat");
  });
});
