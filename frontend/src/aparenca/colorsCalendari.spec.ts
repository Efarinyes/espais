import { describe, expect, it } from "vitest";

import { calendarisPerEspais } from "./colorsCalendari";

describe("colorsCalendari", () => {
  it("assigna un color per espai amb nom només de lletres", () => {
    const calendaris = calendarisPerEspais([{ id: "s1" }, { id: "s2" }]);
    expect(calendaris.s1.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s2.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s1.colorName).not.toBe(calendaris.s2.colorName);
    expect(calendaris.s1.lightColors.main).not.toBe(calendaris.s2.lightColors.main);
  });
});
