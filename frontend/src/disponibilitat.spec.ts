import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";
import { createCalendar, createViewWeek } from "@schedule-x/calendar";

import {
  alcadaGraella,
  attrDiesTancats,
  clicDinsFinestra,
  configGraella,
  diaEnDireccio,
  diaObert,
  diesAFinestres,
  diesOberts,
  diesPerDefecte,
  encaixaClicAFinestra,
  envolupantHorari,
  finestresADies,
  finestresDelsEspais,
  finestresPerRol,
  graellaDelRol,
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
    expect(alcadaGraella("18:00", "22:00")).toBe(352);
    expect(configGraella(laborables)).toEqual({
      start: "17:00",
      end: "23:00",
      gridHeight: 528,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 60,
      minutsMargeFi: 60,
      retallInici: 30,
      retallFi: 30,
    });
  });

  it("la graella de diversos espais comença a l’obertura més d’hora", () => {
    const espais = [
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" })) },
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "18:00", end: "23:00" })) },
      { windows: [0, 2, 4].map((weekday) => ({ weekday, start: "18:00", end: "23:00" })) },
    ];
    expect(configGraella(finestresDelsEspais(espais))).toEqual({
      start: "17:00",
      end: "24:00",
      gridHeight: 616,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 30,
      minutsMargeFi: 60,
      retallInici: 0,
      retallFi: 30,
    });
  });

  it("aplica 30 minuts a l’hora real i després encaixa a HH:00", () => {
    const salaTecnica = [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" }));
    expect(envolupantHorari(salaTecnica)).toEqual({ start: "17:30", end: "22:00" });
    expect(configGraella(salaTecnica)).toEqual({
      start: "17:00",
      end: "23:00",
      gridHeight: 528,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 30,
      minutsMargeFi: 60,
      retallInici: 0,
      retallFi: 30,
    });
    expect(configGraella([{ weekday: 0, start: "17:30", end: "22:30" }])).toEqual({
      start: "17:00",
      end: "23:00",
      gridHeight: 528,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 30,
      minutsMargeFi: 30,
      retallInici: 0,
      retallFi: 0,
    });
    expect(configGraella([{ weekday: 0, start: "00:30", end: "02:00" }])).toEqual({
      start: "00:00",
      end: "03:00",
      gridHeight: 264,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 30,
      minutsMargeFi: 60,
      retallInici: 0,
      retallFi: 30,
    });
    expect(configGraella([{ weekday: 0, start: "22:00", end: "24:00" }])).toEqual({
      start: "21:00",
      end: "24:00",
      gridHeight: 264,
      margeInici: true,
      margeFi: false,
      minutsMargeInici: 60,
      minutsMargeFi: 0,
      retallInici: 30,
      retallFi: 0,
    });
    expect(
      configGraella([
        { weekday: 0, start: "20:00", end: "23:59" },
        { weekday: 0, start: "18:30", end: "23:00" },
      ]),
    ).toEqual({
      start: "18:00",
      end: "24:00",
      gridHeight: 528,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 30,
      minutsMargeFi: 1,
      retallInici: 0,
      retallFi: 0,
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

  it("un dia usa el seu horari, i un dia tancat no en té", () => {
    const windows = [
      { weekday: 0, start: "18:00", end: "22:00" },
      { weekday: 5, start: "10:00", end: "14:00" },
    ];
    expect(configGraella(windows, 0)).toMatchObject({ start: "17:00", end: "23:00" });
    expect(configGraella(windows, 5)).toMatchObject({ start: "09:00", end: "15:00" });
    expect(configGraella(windows, 6)).toBeNull();
    expect(configGraella(windows)).toMatchObject({ start: "09:00", end: "23:00" });
  });

  it("una sala de 20:00 a 23:59 es veu de 19:30 a 24:00", () => {
    const windows = [2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "20:00", end: "23:59" }));
    expect(graellaDelRol(windows, true, false, 0)).toEqual({
      start: "19:00",
      end: "24:00",
      gridHeight: 440,
      margeInici: true,
      margeFi: true,
      minutsMargeInici: 60,
      minutsMargeFi: 1,
      retallInici: 30,
      retallFi: 0,
    });
  });

  it("el coordinador usa la sala seleccionada i el responsable l’envolupant", () => {
    const sala = [
      { weekday: 0, start: "20:00", end: "22:00" },
      { weekday: 5, start: "10:00", end: "12:00" },
    ];
    const altra = [{ weekday: 0, start: "18:30", end: "23:59" }];
    const espais = [
      { windows: sala },
      { windows: altra },
    ];
    const delCoordinador = finestresPerRol(false, espais[0], espais);
    expect(delCoordinador).toEqual(sala);
    expect(graellaDelRol(delCoordinador, false, true, 0)).toMatchObject({
      start: "19:00",
      end: "23:00",
    });
    expect(graellaDelRol(delCoordinador, false, false, 0)).toMatchObject({
      start: "09:00",
      end: "23:00",
    });
    const senseSala = finestresPerRol(false, null, espais);
    expect(senseSala).toEqual([...sala, ...altra]);
    const delResponsable = finestresPerRol(true, espais[0], espais);
    expect(delResponsable).toEqual([...sala, ...altra]);
    expect(graellaDelRol(delResponsable, true, true, 0)).toMatchObject({
      start: "09:00",
      end: "24:00",
      minutsMargeInici: 60,
      minutsMargeFi: 1,
    });
    expect(graellaDelRol(delResponsable, true, false, 5).start).toBe("09:00");
  });

  it("salta al proper dia obert si avui és tancat", () => {
    const windows = [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" }));
    const dijous = Temporal.PlainDate.from("2026-09-10");
    expect(properDiaObert(windows, dijous).toString()).toBe("2026-09-11");
    expect(properDiaObert(windows, Temporal.PlainDate.from("2026-09-11")).toString()).toBe("2026-09-11");
  });

  it("enrere cau al dia obert anterior i endavant al següent", () => {
    const windows = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: "18:00", end: "22:00" }));
    const diumenge = Temporal.PlainDate.from("2026-09-13");
    expect(diaEnDireccio(windows, diumenge, true).toString()).toBe("2026-09-14");
    expect(diaEnDireccio(windows, diumenge, false).toString()).toBe("2026-09-11");
    expect(diaEnDireccio(windows, Temporal.PlainDate.from("2026-09-08"), true).toString()).toBe("2026-09-08");
  });
});
