import { describe, expect, it } from "vitest";

import { consultaCalendari, queryCalendari } from "./consultaCalendari";

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
