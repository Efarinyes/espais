import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";

import IniciView from "./IniciView.vue";

describe("IniciView", () => {
  it("mostra el títol de l’app en català", () => {
    setActivePinia(createPinia());
    const wrapper = mount(IniciView);
    expect(wrapper.text()).toContain("Espais");
    expect(wrapper.text()).toContain("gratuït");
  });
});
