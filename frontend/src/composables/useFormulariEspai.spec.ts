import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";

import { useFormulariEspai } from "./useFormulariEspai";

function muntar(ambActiu?: true) {
  const Host = defineComponent({
    setup: () => (ambActiu ? useFormulariEspai(true) : useFormulariEspai()),
    template: "<div />",
  });
  return mount(Host);
}

describe("useFormulariEspai", () => {
  it("parteix amb aforament 20 i els set dies actius", () => {
    const wrapper = muntar();
    expect(wrapper.vm.camps.capacity).toBe("20");
    expect(wrapper.vm.dies).toHaveLength(7);
    expect(wrapper.vm.dies.every((dia: { actiu: boolean }) => dia.actiu)).toBe(true);
    expect(wrapper.vm.valida()).toBe(false);
    expect(wrapper.vm.errorsCamp.name).toContain("obligatori");
  });

  it("rebutja un aforament que no és un enter positiu", () => {
    const wrapper = muntar();
    wrapper.vm.camps.name = "Sala 1";
    for (const capacity of ["", "0", "-1", "1.5", "20a"]) {
      wrapper.vm.camps.capacity = capacity;
      expect(wrapper.vm.valida()).toBe(false);
      expect(wrapper.vm.errorsCamp.capacity).toContain("enter positiu");
    }
  });

  it("accepta nom i aforament enters positius amb l’horari per defecte", () => {
    const wrapper = muntar();
    wrapper.vm.camps.name = "  Sala 1  ";
    wrapper.vm.camps.capacity = "1";
    expect(wrapper.vm.valida()).toBe(true);
    expect(wrapper.vm.errorsCamp.name).toBe("");
    expect(wrapper.vm.errorsCamp.capacity).toBe("");
    expect(wrapper.vm.errorsCamp.windows).toBe("");
  });

  it("rebutja si no queda cap dia amb horari", () => {
    const wrapper = muntar();
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    wrapper.vm.dies.forEach((dia: { actiu: boolean }) => {
      dia.actiu = false;
    });
    expect(wrapper.vm.valida()).toBe(false);
    expect(wrapper.vm.errorsCamp.windows).toContain("almenys un dia");
  });

  it("rebutja un dia actiu amb l’hora d’inici posterior o igual a la de fi", () => {
    const wrapper = muntar();
    wrapper.vm.camps.name = "Sala 1";
    wrapper.vm.camps.capacity = "10";
    wrapper.vm.dies[0].start = "22:00";
    wrapper.vm.dies[0].end = "08:00";
    expect(wrapper.vm.valida()).toBe(false);
    expect(wrapper.vm.errorsCamp.windows).toContain("anterior");
  });

  it("inclou l’estat actiu només en edició", () => {
    const crea = muntar();
    const edita = muntar(true);
    expect(crea.vm.camps).not.toHaveProperty("active");
    expect(edita.vm.camps.active).toBe(true);
  });
});
