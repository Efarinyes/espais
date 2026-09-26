import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";

import { arrodoneixClicAFranja, parseCompteAssistencia, titolReserva, valorRangAIso } from "./calendari";
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
