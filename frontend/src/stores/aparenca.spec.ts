import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { MODE_STORAGE_KEY, SESSIO_STORAGE_KEY } from "../aparenca";
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

  it("la paleta i el mode no es trepitgen i es rellegeixen en tornar a carregar", () => {
    localStorage.clear();
    localStorage.setItem(SESSIO_STORAGE_KEY, JSON.stringify({ palette: "vinyes" }));
    localStorage.setItem(MODE_STORAGE_KEY, "fosc");
    setActivePinia(createPinia());
    const store = useAparencaStore();
    expect(store.paleta).toBe("vinyes");
    expect(store.mode).toBe("fosc");
    expect(document.documentElement.getAttribute("data-theme")).toBe("vinyes-dark");

    store.setPaletaEntitat("citrics");
    expect(store.mode).toBe("fosc");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("fosc");
    expect(document.documentElement.getAttribute("data-theme")).toBe("citrics-dark");

    store.setMode("clar");
    expect(store.paleta).toBe("citrics");
    expect(document.documentElement.getAttribute("data-theme")).toBe("citrics");

    setActivePinia(createPinia());
    const recarregat = useAparencaStore();
    expect(recarregat.mode).toBe("clar");
    expect(recarregat.paleta).toBe("vinyes");
    expect(document.documentElement.getAttribute("data-theme")).toBe("vinyes");
  });
});
