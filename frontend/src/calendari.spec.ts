import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";

import { arrodoneixClicAFranja, calendarisPerEspais, titolReserva, valorRangAIso } from "./calendari";
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
};

describe("calendari", () => {
  it("amaga el nom a l’altra coordinadora", () => {
    expect(titolReserva({ ...reserva, mine: false }, "coordinator")).toBe("Ocupat");
  });

  it("mostra només el coordinador al responsable", () => {
    expect(titolReserva({ ...reserva, mine: false }, "responsible")).toBe("Carla");
  });

  it("marca la reserva pròpia com a Tu", () => {
    expect(titolReserva(reserva, "coordinator")).toBe("Tu");
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

  it("assigna un color per espai amb nom només de lletres", () => {
    const calendaris = calendarisPerEspais([{ id: "s1" }, { id: "s2" }]);
    expect(calendaris.s1.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s2.colorName).toMatch(/^[a-z]+$/);
    expect(calendaris.s1.colorName).not.toBe(calendaris.s2.colorName);
    expect(calendaris.s1.lightColors.main).not.toBe(calendaris.s2.lightColors.main);
  });
});
