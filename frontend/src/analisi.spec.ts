import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";

import {
  assistenciaEtiqueta,
  horesEtiqueta,
  mesEnCursMadrid,
  percentatgeOcupacio,
  periodeDelMes,
} from "./analisi";

describe("analisi", () => {
  it("calcula el període del mes en Europe/Madrid", () => {
    expect(periodeDelMes("2026-09")).toEqual({
      des: "2026-08-31T22:00:00Z",
      fins: "2026-09-30T22:00:00Z",
    });
  });

  it("formata el mes en curs", () => {
    const ara = Temporal.ZonedDateTime.from("2026-09-12T15:00:00+02:00[Europe/Madrid]");
    expect(mesEnCursMadrid(ara)).toBe("2026-09");
  });

  it("formata ocupació i assistència sense zero silenciós", () => {
    expect(percentatgeOcupacio(1 / 14)).toBe("7,1 %");
    expect(horesEtiqueta(14)).toBe("14 h");
    expect(assistenciaEtiqueta(null, 1)).toBe("Sense registrar");
    expect(assistenciaEtiqueta(10, 1)).toBe("10 (1 sense registrar)");
    expect(assistenciaEtiqueta(null, 0)).toBe("—");
  });
});
