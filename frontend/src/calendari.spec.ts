import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";

import {
  arrodoneixClicAFranja,
  classeTramat,
  classesReserva,
  etiquetaPeriode,
  filaReserva,
  llegendaTramats,
  parseCompteAssistencia,
  nomAccessibleReserva,
  rangVisible,
  reservaVisible,
  titolReserva,
  valorRangAIso,
} from "./calendari";
import type { ReservaDto } from "./services/reserves";

const reserva: ReservaDto = {
  id: "r1",
  space_id: "s1",
  space_name: "Sala 1",
  starts_at: "2026-09-08T08:00:00Z",
  ends_at: "2026-09-08T08:30:00Z",
  status: "confirmed",
  mine: true,
  coordinator_name: "Carla",
  attendance_count: null,
  capacity: 40,
  min_attendance: null,
  exceeds_capacity: false,
  below_min_attendance: false,
};

describe("calendari", () => {
  it("amaga el nom a l’altra coordinadora", () => {
    expect(titolReserva({ ...reserva, mine: false }, "coordinator")).toBe("Ocupat");
  });

  it("mostra només el coordinador al responsable", () => {
    expect(titolReserva({ ...reserva, mine: false }, "responsible")).toBe("Carla");
  });

  it("mostra l’espai a la reserva pròpia del coordinador", () => {
    expect(titolReserva(reserva, "coordinator")).toBe("Sala 1");
  });

  it("el nom accessible de la reserva aliena no porta el coordinador", () => {
    const nom = nomAccessibleReserva({ ...reserva, mine: false }, "coordinator");
    expect(nom.startsWith("Ocupat, Sala 1,")).toBe(true);
    expect(nom).not.toContain("Carla");
    expect(nom).toContain("10:00");
    expect(nom).toContain("10:30");
  });

  it("el nom accessible del responsable inclou espai, coordinador i interval", () => {
    const nom = nomAccessibleReserva({ ...reserva, mine: false }, "responsible");
    expect(nom).toContain("Sala 1");
    expect(nom).toContain("Carla");
    expect(nom).toContain("10:00");
  });

  it("assigna un tramat estable a cada persona, sense dependre de qui més hi ha", () => {
    const llegenda = llegendaTramats([
      { nom: "Núria", clau: "nuria" },
      { nom: "Carla", clau: "carla" },
      { nom: "Carla", clau: "carla" },
      { nom: "  ", clau: "" },
    ]);
    expect(llegenda.map((entrada) => entrada.nom)).toEqual(["Carla", "Núria"]);
    expect(llegenda[0]?.classe).toBe(classeTramat("carla"));
    expect(llegenda[1]?.classe).toBe(classeTramat("nuria"));
    expect(llegenda[0]?.classe).not.toBe(llegenda[1]?.classe);
    const homonims = llegendaTramats([
      { nom: "Anna", clau: "a1" },
      { nom: "Anna", clau: "a2" },
    ]);
    expect(homonims).toHaveLength(2);
    expect(homonims[0]?.classe).not.toBe(homonims[1]?.classe);
  });

  it("amb sala, el coordinador només veu aquella sala i ignora el filtre de persona", () => {
    const propiaAltra = { ...reserva, id: "r2", space_id: "s2", mine: true };
    const aliena = { ...reserva, id: "r3", mine: false, coordinator_name: "Núria" };
    const ambit = { rol: "coordinator" as const, espaiId: "s1", coordinadorId: "nuria" };
    expect(reservaVisible(reserva, ambit)).toBe(true);
    expect(reservaVisible(propiaAltra, ambit)).toBe(false);
    expect(reservaVisible(aliena, ambit)).toBe(true);
    expect(reservaVisible({ ...aliena, space_id: "s2" }, ambit)).toBe(false);
    expect(reservaVisible(aliena, { ...ambit, espaiId: "" })).toBe(false);
    expect(reservaVisible(propiaAltra, { ...ambit, espaiId: "" })).toBe(true);
    expect(titolReserva(reserva, "coordinator", true)).toBe("Teva");
    expect(titolReserva(reserva, "coordinator")).toBe("Sala 1");
  });

  it("el responsable filtra per sala i per la persona triada", () => {
    const anna1 = { ...reserva, id: "a1", coordinator_id: "a1", coordinator_name: "Anna Costa" };
    const anna2 = { ...reserva, id: "a2", space_id: "s2", coordinator_id: "a2", coordinator_name: "Anna Soler" };
    const nuria = { ...reserva, id: "n1", coordinator_id: "n1", coordinator_name: "Núria" };
    const ambit = { rol: "responsible" as const, espaiId: "", coordinadorId: "a1" };
    expect(reservaVisible(anna1, ambit)).toBe(true);
    expect(reservaVisible(anna2, ambit)).toBe(false);
    expect(reservaVisible(nuria, ambit)).toBe(false);
    expect(reservaVisible(anna2, { ...ambit, espaiId: "s1", coordinadorId: "" })).toBe(false);
    expect(reservaVisible(anna1, { ...ambit, espaiId: "s1", coordinadorId: "a1" })).toBe(true);
    expect(classesReserva(anna1, "responsible")).toEqual([classeTramat("a1")]);
    expect(classesReserva({ ...anna1, coordinator_id: "a2", coordinator_name: "Anna Costa" }, "responsible")).not.toEqual(
      classesReserva(anna1, "responsible"),
    );
  });

  it("la fila de llista no revela el coordinador aliè", () => {
    const fila = filaReserva({ ...reserva, mine: false, coordinator_name: "Núria" }, "coordinator");
    expect(fila.propietat).toBe("Ocupat");
    expect(fila.obrible).toBe(false);
    expect(JSON.stringify(fila)).not.toContain("Núria");
    const propia = filaReserva(reserva, "coordinator");
    expect(propia.propietat).toBe("Teva");
    expect(propia.obrible).toBe(true);
    expect(filaReserva({ ...reserva, mine: false }, "responsible").propietat).toBe("Carla");
  });

  it("el rang de la llista segueix la setmana i tanca a les 23:59 si la graella arriba a les 24:00", () => {
    const dilluns = Temporal.PlainDate.from("2026-10-05");
    const rang = rangVisible(dilluns, false, "09:30", "24:00");
    expect(rang.start.toString()).toContain("2026-10-05T09:30");
    expect(rang.end.toString()).toContain("2026-10-11T23:59");
    expect(etiquetaPeriode(dilluns, false)).toContain("2026");
    const dia = rangVisible(dilluns, true, "19:30", "22:30");
    expect(dia.start.toString()).toContain("2026-10-05T19:30");
    expect(dia.end.toString()).toContain("2026-10-05T22:30");
  });

  it("accepta un compte escrit o numèric", () => {
    expect(parseCompteAssistencia("12")).toBe(12);
    expect(parseCompteAssistencia(12)).toBe(12);
    expect(parseCompteAssistencia("")).toBeNull();
    expect(parseCompteAssistencia(-1)).toBeNull();
  });

  it("arrodoneix el clic a 1 hora per defecte", () => {
    const clic = Temporal.ZonedDateTime.from("2026-09-08T10:07:00+02:00[Europe/Madrid]");
    const franja = arrodoneixClicAFranja(clic);
    expect(franja.starts_at).toBe("2026-09-08T08:00:00Z");
    expect(franja.ends_at).toBe("2026-09-08T09:00:00Z");
  });

  it("permet una durada de 2 hores", () => {
    const clic = Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]");
    const franja = arrodoneixClicAFranja(clic, 120);
    expect(franja.ends_at).toBe("2026-09-08T10:00:00Z");
  });

  it("converteix un dia del calendari a ISO", () => {
    expect(valorRangAIso("2026-09-08")).toContain("2026-09-07T22:00:00Z");
  });
});
