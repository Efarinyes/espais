import { describe, expect, it } from "vitest";

import { calendarisPerEspais } from "./colorsCalendari";

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
});
