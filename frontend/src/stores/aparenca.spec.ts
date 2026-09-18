import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { MODE_STORAGE_KEY } from "../aparenca";
import { useAparencaStore } from "./aparenca";

describe("useAparencaStore", () => {
  it("desa el mode al navegador i aplica la paleta de l’entitat sense persistir-la", () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAparencaStore();
    store.setPaletaEntitat("camps");
    store.setMode("fosc");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("fosc");
    expect(localStorage.getItem("espais.aparenca")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("camps-dark");
  });
});
