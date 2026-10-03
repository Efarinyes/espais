import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";
import { createCalendar, createViewWeek } from "@schedule-x/calendar";

import {
  alcadaGraella,
  attrDiesTancats,
  clicDinsFinestra,
  configGraella,
  diaObert,
  diesAFinestres,
  diesOberts,
  diesPerDefecte,
  encaixaClicAFinestra,
  envolupantHorari,
  finestresADies,
  finestresDelsEspais,
  proximaDataDelWeekday,
  properDiaObert,
  resumFinestres,
  validaDies,
  weekdayDelModel,
} from "./disponibilitat";

describe("disponibilitat", () => {
  it("el defecte és tots els dies 08:00–22:00", () => {
    const finestres = diesAFinestres(diesPerDefecte());
    expect(finestres).toHaveLength(7);
    expect(finestres[0]).toEqual({ weekday: 0, start: "08:00", end: "22:00" });
    expect(resumFinestres(finestres)).toBe("Tots els dies 08:00–22:00");
  });

  it("reconstrueix els dies des de finestres parcials", () => {
    const dies = finestresADies([{ weekday: 0, start: "09:00:00", end: "18:00:00" }]);
    expect(dies[0].actiu).toBe(true);
    expect(dies[0].start).toBe("09:00");
    expect(dies[1].actiu).toBe(false);
    expect(diesAFinestres(dies)).toEqual([{ weekday: 0, start: "09:00", end: "18:00" }]);
    expect(resumFinestres(diesAFinestres(dies))).toBe("Dilluns 09:00–18:00");
  });

  it("llista els dies amb la mateixa franja i no diu finestres", () => {
    const dies = diesPerDefecte().map((dia) => ({
      ...dia,
      actiu: dia.weekday === 0 || dia.weekday === 2 || dia.weekday === 4,
    }));
    expect(resumFinestres(diesAFinestres(dies))).toBe("Dilluns, Dimecres i Divendres 08:00–22:00");
  });

  it("llista cada dia amb la seva franja si els horaris difereixen", () => {
    expect(
      resumFinestres([
        { weekday: 0, start: "08:00", end: "14:00" },
        { weekday: 2, start: "16:00", end: "22:00" },
      ]),
    ).toBe("Dilluns 08:00–14:00, Dimecres 16:00–22:00");
  });

  it("no trenca si l’API no envia finestres", () => {
    expect(resumFinestres(undefined)).toBe("Sense horari");
    expect(finestresADies(undefined)[0]?.actiu).toBe(false);
  });

  it("exigeix un dia actiu i hores coherents", () => {
    const dies = diesPerDefecte().map((dia) => ({ ...dia, actiu: false }));
    expect(validaDies(dies)).toContain("almenys un dia");
    dies[0].actiu = true;
    dies[0].start = "18:00";
    dies[0].end = "09:00";
    expect(validaDies(dies)).toContain("inici");
  });

  it("envolupa hores i dies oberts de finestres parcials", () => {
    const laborables = [0, 1, 2, 3, 4].map((weekday) => ({
      weekday,
      start: "18:00",
      end: "22:00",
    }));
    expect(envolupantHorari(laborables)).toEqual({ start: "18:00", end: "22:00" });
    expect(diaObert(laborables, 1)).toBe(true);
    expect(diaObert(laborables, 6)).toBe(false);
    expect(diesOberts(laborables).map((dia) => dia.etiqueta)).toEqual([
      "Dilluns",
      "Dimarts",
      "Dimecres",
      "Dijous",
      "Divendres",
    ]);
    expect(attrDiesTancats(laborables)).toBe("5 6");
    expect(alcadaGraella("18:00", "22:00")).toBe(560);
    expect(configGraella(laborables)).toEqual({
      start: "17:00",
      end: "23:00",
      gridHeight: 840,
      margeInici: true,
      margeFi: true,
    });
  });

  it("la graella de diversos espais comença a l’obertura més d’hora", () => {
    const espais = [
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" })) },
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "18:00", end: "23:00" })) },
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "18:00", end: "23:00" })) },
    ];
    expect(configGraella(finestresDelsEspais(espais))).toEqual({
      start: "16:00",
      end: "24:00",
      gridHeight: 1120,
      margeInici: true,
      margeFi: true,
    });
  });

  it("arrodoneix l’envolupant a hores senceres per a Schedule-X", () => {
    const salaTecnica = [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" }));
    expect(envolupantHorari(salaTecnica)).toEqual({ start: "17:30", end: "22:00" });
    expect(configGraella(salaTecnica)).toEqual({
      start: "16:00",
      end: "23:00",
      gridHeight: 980,
      margeInici: true,
      margeFi: true,
    });
    expect(configGraella([{ weekday: 0, start: "17:30", end: "22:30" }])).toEqual({
      start: "16:00",
      end: "24:00",
      gridHeight: 1120,
      margeInici: true,
      margeFi: true,
    });
    expect(configGraella([{ weekday: 0, start: "00:30", end: "02:00" }])).toEqual({
      start: "00:00",
      end: "03:00",
      gridHeight: 420,
      margeInici: false,
      margeFi: true,
    });
    expect(configGraella([{ weekday: 0, start: "22:00", end: "24:00" }])).toEqual({
      start: "21:00",
      end: "24:00",
      gridHeight: 420,
      margeInici: true,
      margeFi: false,
    });
    const graella = configGraella(salaTecnica);
    const app = createCalendar({
      views: [createViewWeek()],
      dayBoundaries: { start: graella.start, end: graella.end },
    });
    expect(app).toBeTruthy();
    app.destroy();
    expect(() =>
      createCalendar({
        views: [createViewWeek()],
        dayBoundaries: { start: "17:30", end: "22:00" },
      }),
    ).toThrow(/HH:00/);
  });


  it("accepta un clic dins de la finestra i n’encaixa un de proper", () => {
    const windows = [{ weekday: 1, start: "18:00", end: "22:00" }];
    const dins = Temporal.ZonedDateTime.from("2026-09-08T18:30:00+02:00[Europe/Madrid]");
    const aProp = Temporal.ZonedDateTime.from("2026-09-08T17:45:00+02:00[Europe/Madrid]");
    const lluny = Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]");
    const diumenge = Temporal.ZonedDateTime.from("2026-09-13T18:00:00+02:00[Europe/Madrid]");
    expect(weekdayDelModel(dins)).toBe(1);
    expect(clicDinsFinestra(windows, dins, 60)).toBe(true);
    expect(clicDinsFinestra(windows, aProp, 60)).toBe(false);
    expect(encaixaClicAFinestra(windows, aProp, 60)?.hour).toBe(18);
    expect(encaixaClicAFinestra(windows, lluny, 60)).toBeNull();
    expect(encaixaClicAFinestra(windows, diumenge, 60)).toBeNull();
  });

  it("troba el proper dia d’un weekday", () => {
    const dimarts = Temporal.PlainDate.from("2026-09-08");
    expect(proximaDataDelWeekday(dimarts, 1).toString()).toBe("2026-09-08");
    expect(proximaDataDelWeekday(dimarts, 4).toString()).toBe("2026-09-11");
    expect(proximaDataDelWeekday(dimarts, 0).toString()).toBe("2026-09-14");
  });

  it("salta al proper dia obert si avui és tancat", () => {
    const windows = [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" }));
    const dijous = Temporal.PlainDate.from("2026-09-10");
    expect(properDiaObert(windows, dijous).toString()).toBe("2026-09-11");
    expect(properDiaObert(windows, Temporal.PlainDate.from("2026-09-11")).toString()).toBe("2026-09-11");
  });
});
