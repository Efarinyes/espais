import { describe, expect, it } from "vitest";

import { diesAFinestres, diesPerDefecte, finestresADies, resumFinestres, validaDies } from "./disponibilitat";

describe("disponibilitat", () => {
  it("el defecte és tots els dies 08:00–22:00", () => {
    const finestres = diesAFinestres(diesPerDefecte());
    expect(finestres).toHaveLength(7);
    expect(finestres[0]).toEqual({ weekday: 0, start: "08:00", end: "22:00" });
    expect(resumFinestres(finestres)).toBe("Tots els dies 08:00–22:00");
  });

  it("reconstrueix els dies des de finestres parcials", () => {
    const dies = finestresADies([{ weekday: 0, start: "09:00:00", end: "18:00:00" }]);
    expect(dies[0].actiu).toBe(true);
    expect(dies[0].start).toBe("09:00");
    expect(dies[1].actiu).toBe(false);
    expect(diesAFinestres(dies)).toEqual([{ weekday: 0, start: "09:00", end: "18:00" }]);
    expect(resumFinestres(diesAFinestres(dies))).toBe("Dilluns 09:00–18:00");
  });

  it("no trenca si l’API no envia finestres", () => {
    expect(resumFinestres(undefined)).toBe("Sense horari");
    expect(finestresADies(undefined)[0]?.actiu).toBe(false);
  });

  it("exigeix un dia actiu i hores coherents", () => {
    const dies = diesPerDefecte().map((dia) => ({ ...dia, actiu: false }));
    expect(validaDies(dies)).toContain("almenys un dia");
    dies[0].actiu = true;
    dies[0].start = "18:00";
    dies[0].end = "09:00";
    expect(validaDies(dies)).toContain("inici");
  });
});
