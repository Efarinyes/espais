import { describe, expect, it } from "vitest";

import { consultaCalendari, diaDeQuery, queryCalendari } from "./consultaCalendari";

describe("consulta del calendari", () => {
  it("llegeix espai, coordinador i vista, i omet els buits", () => {
    expect(consultaCalendari({ espai: "s1", coordinador: "u2", vista: "llista" })).toEqual({
      espai: "s1",
      coordinador: "u2",
      vista: "llista",
    });
    expect(consultaCalendari({ vista: "graella" }).vista).toBe("graella");
    expect(consultaCalendari({ cerca: "Anna" }).coordinador).toBe("");
    expect(queryCalendari({ espai: "s1", coordinador: "u2", vista: "llista", alt: "1" }, { espai: "" })).toEqual({
      coordinador: "u2",
      vista: "llista",
      alt: "1",
    });
    expect(queryCalendari({ espai: "s1", cerca: "Anna", vista: "llista" }, { coordinador: "u2" })).toEqual({
      espai: "s1",
      coordinador: "u2",
      vista: "llista",
    });
    expect(queryCalendari({ espai: "s1", vista: "llista" }, { vista: "graella" })).toEqual({ espai: "s1" });
  });
});

describe("dia demanat per un avís", () => {
  it("accepta una data AAAA-MM-DD i descarta la resta", () => {
    expect(diaDeQuery({ data: "2026-09-08" })).toBe("2026-09-08");
    expect(diaDeQuery({ data: ["2026-09-08", "x"] })).toBe("2026-09-08");
    expect(diaDeQuery({ data: "08/09/2026" })).toBeNull();
    expect(diaDeQuery({ data: "demà" })).toBeNull();
    expect(diaDeQuery({})).toBeNull();
  });

  it("conserva la data en canviar espai o vista", () => {
    expect(queryCalendari({ data: "2026-09-08", espai: "s1" }, { vista: "llista" })).toEqual({
      data: "2026-09-08",
      espai: "s1",
      vista: "llista",
    });
  });
});
