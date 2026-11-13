import { describe, expect, it } from "vitest";

import { calendarisPerEspais } from "./colorsCalendari";
import { luminancia, relacioContrast } from "./contrast";

function toHue(hex: string): number {
  const color = hex.replace("#", "");
  const canal = (index: number) => Number.parseInt(color.slice(index, index + 2), 16) / 255;
  const r = canal(0);
  const g = canal(2);
  const b = canal(4);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  return (hue * 60 + 360) % 360;
}

describe("colorsCalendari", () => {
  it("assigna un color per espai amb nom només de lletres", () => {
    const calendaris = calendarisPerEspais([{ id: "s1" }, { id: "s2" }]);
    expect(calendaris.s1.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s2.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s1.colorName).not.toBe(calendaris.s2.colorName);
  });

  it("dues sales que caurien al mateix to en reben dos, i l’id petit es queda el seu", () => {
    const perTo = new Map<string, string>();
    let primera = "";
    let segona = "";
    for (let i = 0; i < 200 && segona === ""; i += 1) {
      const id = `sala-${i}`;
      const sol = calendarisPerEspais([{ id }])[id].lightColors.main;
      const altre = perTo.get(sol);
      if (altre) {
        primera = altre;
        segona = id;
      } else {
        perTo.set(sol, id);
      }
    }
    expect(segona).not.toBe("");
    const [petit, gran] = [primera, segona].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const junts = calendarisPerEspais([{ id: gran }, { id: petit }]);
    const solPetit = calendarisPerEspais([{ id: petit }])[petit].lightColors.main;
    const solGran = calendarisPerEspais([{ id: gran }])[gran].lightColors.main;
    expect(junts[petit].lightColors.main).toBe(solPetit);
    expect(junts[gran].lightColors.main).not.toBe(solGran);
    expect(junts[petit].lightColors.main).not.toBe(junts[gran].lightColors.main);
    const reves = calendarisPerEspais([{ id: petit }, { id: gran }]);
    expect(reves[petit].lightColors.main).toBe(junts[petit].lightColors.main);
    expect(reves[gran].lightColors.main).toBe(junts[gran].lightColors.main);
  });

  it("manté el color de cada espai si la llista arriba en un altre ordre", () => {
    const endavant = calendarisPerEspais([{ id: "sala-a" }, { id: "sala-b" }, { id: "sala-c" }]);
    const enrere = calendarisPerEspais([{ id: "sala-c" }, { id: "sala-a" }, { id: "sala-b" }]);
    for (const id of ["sala-a", "sala-b", "sala-c"]) {
      expect(enrere[id].lightColors.main).toBe(endavant[id].lightColors.main);
      expect(enrere[id].colorName).toBe(endavant[id].colorName);
    }
  });

  it("els vuit colors se separen i el text de la casella arriba a 4,5:1", () => {
    const esperats = ["#8E4038", "#2F6A5C", "#A9C48A", "#3E5270", "#E0A06A", "#4E6A38", "#D4A0B8", "#8FB0C4"];
    const mains = new Set<string>();
    const vistos = new Map<string, string>();
    for (let i = 0; i < 400 && mains.size < 8; i += 1) {
      const id = `espai-${i}`;
      const main = calendarisPerEspais([{ id }])[id].lightColors.main;
      mains.add(main);
      vistos.set(main, id);
    }
    expect([...mains].sort()).toEqual([...esperats].sort());
    expect(mains.has("#8B5CF6")).toBe(false);
    expect(mains.has("#6D28D9")).toBe(false);
    expect(mains.has("#1D4ED8")).toBe(false);
    expect(mains.has("#DC2626")).toBe(false);
    const tons = [...mains].map((hex) => ({ hex, to: toHue(hex), llum: luminancia(hex) }));
    expect(tons.filter((to) => to.to >= 250 && to.to <= 310)).toEqual([]);
    for (let i = 0; i < tons.length; i += 1) {
      for (let j = i + 1; j < tons.length; j += 1) {
        const gir = Math.abs(tons[i].to - tons[j].to) % 360;
        const separats = Math.abs(tons[i].llum - tons[j].llum) >= 0.2;
        if (!separats) {
          expect(Math.min(gir, 360 - gir)).toBeGreaterThanOrEqual(40);
        }
      }
    }
    for (const id of vistos.values()) {
      const colors = calendarisPerEspais([{ id }])[id];
      expect(colors.darkColors.container).toBe(colors.lightColors.main);
      expect(colors.lightColors.container).toBe(colors.lightColors.main);
      expect(relacioContrast(colors.lightColors.main, colors.lightColors.onContainer)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
