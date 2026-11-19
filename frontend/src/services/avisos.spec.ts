import { describe, expect, it } from "vitest";

import {
  descripcioCanvis,
  diaMadrid,
  enllacReserva,
  etiquetaAvis,
  missatgeAvis,
  titolReservaAvis,
} from "./avisos";

const modificada = {
  type: "reservation_rescheduled",
  space_name: "Sala 1",
  space_id: "s1",
  starts_at: "2026-09-08T08:00:00Z",
  new_starts_at: "2026-09-09T16:00:00Z",
};
const anullada = { type: "reservation_cancelled", space_name: "Sala 1", space_id: "s1", starts_at: "2026-09-08T08:00:00Z", new_starts_at: null };

describe("textos dels avisos", () => {
  it("distingeix clarament una reserva modificada d’una d’anul·lada", () => {
    expect(etiquetaAvis(modificada)).toBe("Modificada");
    expect(etiquetaAvis(anullada)).toBe("Anul·lada");
    expect(titolReservaAvis(modificada)).toBe("Reserva modificada: Sala 1");
    expect(titolReservaAvis(anullada)).toBe("Reserva anul·lada: Sala 1");
    expect(missatgeAvis(modificada)).toBe("Aquesta reserva ha estat modificada.");
    expect(missatgeAvis(anullada)).toBe("Aquesta reserva ha estat anul·lada.");
  });

  it("explica què ha canviat", () => {
    expect(descripcioCanvis(["date"])).toBe("Ha canviat el dia.");
    expect(descripcioCanvis(["start_time", "end_time"])).toBe("Ha canviat l’hora d’inici i l’hora de fi.");
    expect(descripcioCanvis(["date", "start_time", "end_time"])).toBe(
      "Ha canviat el dia, l’hora d’inici i l’hora de fi.",
    );
    expect(descripcioCanvis([])).toBe("");
    expect(descripcioCanvis(undefined)).toBe("");
    expect(descripcioCanvis(["desconegut"])).toBe("");
  });
});

describe("enllaç a la reserva", () => {
  it("una reserva modificada s’obre al calendari el dia nou i a l’espai", () => {
    expect(enllacReserva(modificada)).toEqual({
      name: "calendari",
      query: { data: "2026-09-09", espai: "s1" },
    });
  });

  it("el dia és el de Madrid, no el d’UTC", () => {
    expect(diaMadrid("2026-09-08T22:30:00Z")).toBe("2026-09-09");
    expect(diaMadrid("2026-12-31T23:30:00Z")).toBe("2027-01-01");
    expect(diaMadrid("2026-09-08T08:00:00Z")).toBe("2026-09-08");
  });

  it("sense espai conegut, només porta el dia", () => {
    expect(enllacReserva({ ...modificada, space_id: null })).toEqual({
      name: "calendari",
      query: { data: "2026-09-09" },
    });
  });

  it("una reserva anul·lada ja no surt al calendari: no hi ha enllaç", () => {
    expect(enllacReserva(anullada)).toBeNull();
  });
});
