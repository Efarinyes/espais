import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";

import { diaIsoDeElement, reservaIdDeElement, zonedDesDePuntGraella } from "./arrossegarReserva";

describe("arrossegarReserva", () => {
  it("tradueix el punt de la graella a una hora arrodonida", () => {
    const inici = zonedDesDePuntGraella("2026-09-08", 0, 560, "18:00", "22:00");
    expect(inici.toString()).toBe("2026-09-08T18:00:00+02:00[Europe/Madrid]");
    const mig = zonedDesDePuntGraella("2026-09-08", 280, 560, "18:00", "22:00");
    expect(mig.toString()).toBe("2026-09-08T20:00:00+02:00[Europe/Madrid]");
    const tresQuarts = zonedDesDePuntGraella("2026-09-08", 210, 560, "18:00", "22:00");
    expect(tresQuarts.toString()).toBe("2026-09-08T19:30:00+02:00[Europe/Madrid]");
  });

  it("llegeix l’id de la reserva i el dia de la columna", () => {
    const dia = document.createElement("div");
    dia.setAttribute("data-time-grid-date", "2026-09-09");
    const event = document.createElement("div");
    event.setAttribute("data-event-id", "r1");
    dia.append(event);
    expect(diaIsoDeElement(event)).toBe("2026-09-09");
    expect(reservaIdDeElement(event)).toBe("r1");
    expect(diaIsoDeElement(document.createElement("div"))).toBeNull();
  });
});
