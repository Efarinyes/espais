import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";

import {
  assistenciaEtiqueta,
  espaiMesActiu,
  espaisPerOcupacio,
  fraccio,
  horesLliures,
  repartimentReserves,
  reservesAmbAssistencia,
  senseHoresDisponibles,
  horesEtiqueta,
  mesEnCursTimeZone,
  percentatgeOcupacio,
  periodeDelMes,
} from "./analisi";

describe("analisi", () => {
  it("calcula el període del mes al fus indicat", () => {
    expect(periodeDelMes("2026-09")).toEqual({
      des: "2026-08-31T22:00:00Z",
      fins: "2026-09-30T22:00:00Z",
    });
    expect(periodeDelMes("2026-09", "America/New_York")).toEqual({
      des: "2026-09-01T04:00:00Z",
      fins: "2026-10-01T04:00:00Z",
    });
  });

  it("formata el mes en curs al fus indicat", () => {
    const ara = Temporal.ZonedDateTime.from("2026-09-01T02:00:00+02:00[Europe/Madrid]");
    expect(mesEnCursTimeZone("Europe/Madrid", ara)).toBe("2026-09");
    expect(mesEnCursTimeZone("America/New_York", ara)).toBe("2026-08");
  });

  it("formata ocupació i assistència sense zero silenciós", () => {
    expect(percentatgeOcupacio(1 / 14)).toBe("7,1 %");
    expect(horesEtiqueta(14)).toBe("14 h");
    expect(assistenciaEtiqueta(null, 1)).toBe("Sense registrar");
    expect(assistenciaEtiqueta(10, 1)).toBe("10 (1 sense registrar)");
    expect(assistenciaEtiqueta(null, 0)).toBe("—");
  });
});

function espai(id: string, nom: string, conf: number, hores: number, ratio: number) {
  return {
    space_id: id,
    space_name: nom,
    confirmed_count: conf,
    reserved_hours: hores,
    occupancy_ratio: ratio,
  };
}

describe("analisi: dades per al dashboard", () => {
  it("les hores lliures no són mai negatives i sense horari no hi ha ocupació", () => {
    expect(horesLliures(42, 160)).toBe(118);
    expect(horesLliures(10, 4)).toBe(0);
    expect(senseHoresDisponibles(0)).toBe(true);
    expect(senseHoresDisponibles(0.5)).toBe(false);
  });

  it("ordena els espais per ocupació i desempata amb reserves i nom", () => {
    const llista = [
      espai("c", "Taller", 1, 2, 0.1),
      espai("a", "Pati", 3, 6, 0.3),
      espai("b", "Aula", 3, 6, 0.3),
      espai("d", "Sala", 9, 1, 0.5),
    ];
    expect(espaisPerOcupacio(llista).map((e) => e.space_id)).toEqual(["d", "b", "a", "c"]);
    expect(llista[0]?.space_id).toBe("c");
  });

  it("l’espai amb més activitat és el de més reserves i, sense reserves, no n’hi ha cap", () => {
    expect(
      espaiMesActiu([espai("a", "A", 2, 10, 0.1), espai("b", "B", 5, 1, 0.01), espai("c", "C", 5, 3, 0.02)])?.space_id,
    ).toBe("c");
    expect(espaiMesActiu([espai("a", "A", 0, 0, 0)])).toBeNull();
    expect(espaiMesActiu([])).toBeNull();
  });

  it("el repartiment de reserves deixa fora els espais sense reserves", () => {
    const llista = [espai("a", "A", 0, 0, 0), espai("b", "B", 2, 1, 0.1), espai("c", "C", 7, 1, 0.1)];
    expect(repartimentReserves(llista).map((e) => e.space_id)).toEqual(["c", "b"]);
  });

  it("les reserves amb assistència són les confirmades menys les sense registrar", () => {
    expect(reservesAmbAssistencia(18, 2)).toBe(16);
    expect(reservesAmbAssistencia(3, 3)).toBe(0);
    expect(reservesAmbAssistencia(0, 0)).toBe(0);
  });

  it("la fracció es limita a 0–1 i sense total és 0", () => {
    expect(fraccio(5, 20)).toBe(0.25);
    expect(fraccio(30, 20)).toBe(1);
    expect(fraccio(-1, 20)).toBe(0);
    expect(fraccio(5, 0)).toBe(0);
  });
});
