import { describe, expect, it } from "vitest";

import { calendarisPerEspais } from "./colorsCalendari";
import { relacioContrast } from "./contrast";

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

  it("manté el color de cada espai si la llista arriba en un altre ordre", () => {
    const endavant = calendarisPerEspais([{ id: "sala-a" }, { id: "sala-b" }, { id: "sala-c" }]);
    const enrere = calendarisPerEspais([{ id: "sala-c" }, { id: "sala-a" }, { id: "sala-b" }]);
    for (const id of ["sala-a", "sala-b", "sala-c"]) {
      expect(enrere[id].lightColors.main).toBe(endavant[id].lightColors.main);
      expect(enrere[id].colorName).toBe(endavant[id].colorName);
    }
  });

  it("els vuit colors se separen i el text de la casella arriba a 4,5:1", () => {
    const mains = new Set<string>();
    for (let i = 0; i < 400 && mains.size < 8; i += 1) {
      const id = `espai-${i}`;
      mains.add(calendarisPerEspais([{ id }])[id].lightColors.main);
    }
    expect(mains.size).toBe(8);
    expect(mains.has("#8B5CF6")).toBe(false);
    expect(mains.has("#0B5ED7")).toBe(false);
    expect(mains.has("#92400E")).toBe(false);
    expect(mains.has("#A16207")).toBe(false);
    expect(mains.has("#C2410C")).toBe(false);
    const tons = [...mains].map(toHue);
    for (let i = 0; i < tons.length; i += 1) {
      for (let j = i + 1; j < tons.length; j += 1) {
        const gir = Math.abs(tons[i] - tons[j]) % 360;
        expect(Math.min(gir, 360 - gir)).toBeGreaterThanOrEqual(28);
      }
    }
    for (let i = 0; i < 40; i += 1) {
      const id = `sala-${i}`;
      const colors = calendarisPerEspais([{ id }])[id];
      expect(colors.darkColors.container).toBe(colors.lightColors.main);
      expect(colors.lightColors.container).toBe(colors.lightColors.main);
      expect(relacioContrast(colors.lightColors.main, colors.lightColors.onContainer)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
