import { describe, expect, it } from "vitest";

import { consultaCalendari, queryCalendari } from "./consultaCalendari";

describe("consulta del calendari", () => {
  it("llegeix espai, cerca i vista, i omet els buits", () => {
    expect(consultaCalendari({ espai: "s1", cerca: "Anna", vista: "llista" })).toEqual({
      espai: "s1",
      cerca: "Anna",
      vista: "llista",
    });
    expect(consultaCalendari({ vista: "graella" }).vista).toBe("graella");
    expect(queryCalendari({ espai: "s1", cerca: "Anna", vista: "llista", alt: "1" }, { espai: "" })).toEqual({
      cerca: "Anna",
      vista: "llista",
      alt: "1",
    });
    expect(queryCalendari({ espai: "s1", vista: "llista" }, { vista: "graella" })).toEqual({ espai: "s1" });
  });
});
