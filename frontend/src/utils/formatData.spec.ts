import { describe, expect, it } from "vitest";

import { diaMadrid, horariMadrid } from "./formatData";

describe("formatData", () => {
  it("dona el dia i l’horari d’una reserva a l’hora de Madrid", () => {
    expect(diaMadrid("2026-09-10T16:00:00Z")).toBe("dj., 10 de set.");
    expect(horariMadrid("2026-09-10T16:00:00Z", "2026-09-10T18:30:00Z")).toBe("18:00–20:30");
  });

  it("el dia segueix l’hora de Madrid, no la d’UTC", () => {
    expect(diaMadrid("2026-09-10T22:30:00Z")).toBe("dv., 11 de set.");
  });
});
