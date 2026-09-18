import { describe, expect, it } from "vitest";

import {
  APARENCA_PER_DEFECTE,
  MODE_STORAGE_KEY,
  aplicarTema,
  llegirAparenca,
  llegirMode,
  llegirPaletaEntitat,
  nomTema,
} from "./aparenca";

describe("aparenca", () => {
  it("el defecte és Mar i cel en mode clar", () => {
    expect(llegirAparenca(null)).toEqual(APARENCA_PER_DEFECTE);
    expect(nomTema("mar-cel", "clar")).toBe("mar-cel");
    expect(nomTema("vinyes", "fosc")).toBe("vinyes-dark");
  });

  it("el mode es llegeix del navegador i ignora paletes desconegudes a la sessió", () => {
    expect(llegirMode(null, null)).toBe("clar");
    expect(llegirMode("fosc", null)).toBe("fosc");
    expect(llegirMode(null, JSON.stringify({ paleta: "neon", mode: "fosc" }))).toBe("fosc");
    expect(llegirPaletaEntitat(null)).toBe("mar-cel");
    expect(llegirPaletaEntitat(JSON.stringify({ palette: "vinyes" }))).toBe("vinyes");
    expect(llegirPaletaEntitat(JSON.stringify({ palette: "neon" }))).toBe("mar-cel");
  });

  it("aplica el tema a l’html", () => {
    aplicarTema("citrics", "fosc");
    expect(document.documentElement.getAttribute("data-theme")).toBe("citrics-dark");
  });
});

describe("MODE_STORAGE_KEY", () => {
  it("és estable per no perdre la tria de clar o fosc", () => {
    expect(MODE_STORAGE_KEY).toBe("espais.mode");
  });
});
