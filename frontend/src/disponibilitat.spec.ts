import "temporal-polyfill/global";
import { describe, expect, it, vi } from "vitest";
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
  graellaDeLaVista,
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

  it("enrere cau al dia obert anterior i endavant al següent", () => {
    const windows = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: "18:00", end: "22:00" }));
    const diumenge = Temporal.PlainDate.from("2026-09-13");
    expect(diaEnDireccio(windows, diumenge, true).toString()).toBe("2026-09-14");
    expect(diaEnDireccio(windows, diumenge, false).toString()).toBe("2026-09-11");
    expect(diaEnDireccio(windows, Temporal.PlainDate.from("2026-09-08"), true).toString()).toBe("2026-09-08");
  });
});

describe("graella del calendari: mitja hora abans i mitja hora després", () => {
  const franja = (weekdays: number[], start: string, end: string) =>
    weekdays.map((weekday) => ({ weekday, start, end }));
  const sala1 = { windows: franja([2, 3, 4, 5, 6], "18:00", "21:00") };
  const sala2 = { windows: franja([1, 2, 3, 4, 5], "19:00", "22:30") };
  const sala3 = { windows: franja([0, 1, 2, 3, 4, 5, 6], "20:00", "23:00") };
  const limits = (graella: { start: string; end: string } | null) =>
    graella && { start: graella.start, end: graella.end };

  it("cas 1: 18:00–21:00 es veu de 17:30 a 21:30", () => {
    expect(limits(configGraella(sala1.windows))).toEqual({ start: "17:30", end: "21:30" });
  });

  it("cas 2: 19:00–22:30 es veu de 18:30 a 23:00", () => {
    expect(limits(configGraella(sala2.windows))).toEqual({ start: "18:30", end: "23:00" });
  });

  it("cas 3: dues sales es veuen de 17:30 a 23:00", () => {
    expect(limits(configGraella(finestresDelsEspais([sala1, sala2])))).toEqual({ start: "17:30", end: "23:00" });
  });

  it("cas 4: tres sales es veuen de 17:30 a 23:30", () => {
    expect(limits(configGraella(finestresDelsEspais([sala1, sala2, sala3])))).toEqual({
      start: "17:30",
      end: "23:30",
    });
  });

  it("cas 5: un dia només compta les finestres d’aquell dia", () => {
    const windows = [
      { weekday: 0, start: "18:00", end: "21:00" },
      { weekday: 5, start: "10:00", end: "12:00" },
    ];
    expect(limits(configGraella(windows, 0))).toEqual({ start: "17:30", end: "21:30" });
    expect(limits(configGraella(windows, 5))).toEqual({ start: "09:30", end: "12:30" });
    expect(configGraella(windows, 6)).toBeNull();
    expect(limits(configGraella(windows))).toEqual({ start: "09:30", end: "21:30" });
  });

  it("cas 6: una obertura a mitja hora no s’arrodoneix", () => {
    expect(limits(configGraella(franja([0], "18:30", "21:00")))).toEqual({ start: "18:00", end: "21:30" });
    expect(limits(configGraella(franja([0], "18:15", "21:00")))).toEqual({ start: "17:45", end: "21:30" });
  });

  it("cas 7: un tancament a mitja hora no s’arrodoneix", () => {
    expect(limits(configGraella(franja([0], "18:00", "21:30")))).toEqual({ start: "17:30", end: "22:00" });
    expect(limits(configGraella(franja([0], "18:00", "22:45")))).toEqual({ start: "17:30", end: "23:15" });
  });

  it("cas 8: el marge no passa de la fi del dia ni de l’inici", () => {
    expect(limits(configGraella(franja([2, 3, 4, 5, 6], "20:00", "23:59")))).toEqual({
      start: "19:30",
      end: "24:00",
    });
    expect(limits(configGraella(franja([0], "00:15", "02:00")))).toEqual({ start: "00:00", end: "02:30" });
  });

  it("l’alçada i el gris corresponen al rang exacte", () => {
    expect(configGraella(finestresDelsEspais([sala1, sala2]))).toMatchObject({
      gridHeight: 484,
      minutsMargeInici: 30,
      minutsMargeFi: 30,
    });
    expect(configGraella(franja([0], "20:00", "23:59"))).toMatchObject({
      gridHeight: 396,
      minutsMargeInici: 30,
      minutsMargeFi: 1,
    });
  });

  it("cas 9: el responsable veu l’envolupant de totes les sales actives", () => {
    const espais = [sala1, sala2, sala3];
    const finestres = finestresPerRol(true, sala1, espais);
    expect(finestres).toEqual(finestresDelsEspais(espais));
    expect(limits(graellaDeLaVista(finestres, false, 0))).toEqual({ start: "17:30", end: "23:30" });
  });

  it("cas 10: el coordinador veu la sala seleccionada, o totes si no n’ha triat cap", () => {
    const espais = [sala1, sala2, sala3];
    expect(limits(graellaDeLaVista(finestresPerRol(false, sala2, espais), false, 0))).toEqual({
      start: "18:30",
      end: "23:00",
    });
    expect(limits(graellaDeLaVista(finestresPerRol(false, null, espais), false, 0))).toEqual({
      start: "17:30",
      end: "23:30",
    });
  });

  it("cas 11: canviar de sala canvia el rang", () => {
    const espais = [sala1, sala2];
    expect(limits(graellaDeLaVista(finestresPerRol(false, sala1, espais), false, 0))).toEqual({
      start: "17:30",
      end: "21:30",
    });
    expect(limits(graellaDeLaVista(finestresPerRol(false, sala2, espais), false, 0))).toEqual({
      start: "18:30",
      end: "23:00",
    });
  });

  it("cas 12: la setmana usa tots els dies i el dia només el seu, per als dos rols", () => {
    const finestres = finestresDelsEspais([sala1, sala2, sala3]);
    for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
      expect(limits(graellaDeLaVista(finestres, false, weekday))).toEqual({ start: "17:30", end: "23:30" });
    }
    expect(limits(graellaDeLaVista(finestres, true, 0))).toEqual({ start: "19:30", end: "23:30" });
    expect(limits(graellaDeLaVista(finestres, true, 1))).toEqual({ start: "18:30", end: "23:30" });
    expect(limits(graellaDeLaVista(finestres, true, 2))).toEqual({ start: "17:30", end: "23:30" });
    expect(limits(graellaDeLaVista(sala1.windows, true, 0))).toEqual({ start: "17:30", end: "21:30" });
  });

  it("cas 13: sense finestres, la graella usa l’horari per defecte d’un espai nou", () => {
    expect(limits(configGraella([]))).toEqual({ start: "07:30", end: "22:30" });
    expect(limits(configGraella(undefined))).toEqual({ start: "07:30", end: "22:30" });
  });

  it("Schedule-X pinta l’eix i les reserves dins del mateix rang amb minuts", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const graella = configGraella(finestresDelsEspais([sala1, sala2]));
    const arrel = document.createElement("div");
    document.body.appendChild(arrel);
    const app = createCalendar({
      views: [createViewWeek()],
      isResponsive: false,
      locale: "ca-ES",
      timezone: "Europe/Madrid",
      selectedDate: Temporal.PlainDate.from("2026-10-07"),
      dayBoundaries: { start: graella.start, end: graella.end },
      weekOptions: {
        gridStep: 30,
        gridHeight: graella.gridHeight,
        timeAxisFormatOptions: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
      },
      events: [
        {
          id: "r1",
          title: "Reserva",
          start: Temporal.ZonedDateTime.from("2026-10-07T18:00:00+02:00[Europe/Madrid]"),
          end: Temporal.ZonedDateTime.from("2026-10-07T21:00:00+02:00[Europe/Madrid]"),
        },
      ],
    });
    app.render(arrel);
    await new Promise((resolt) => setTimeout(resolt, 50));
    const hores = [...arrel.querySelectorAll(".sx__week-grid__hour-text")].map((node) => node.textContent);
    expect(hores).toEqual([
      "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
      "20:30", "21:00", "21:30", "22:00", "22:30",
    ]);
    expect(document.documentElement.style.getPropertyValue("--sx-week-grid-hour-height")).toBe("44px");
    const reserva = arrel.querySelector<HTMLElement>(".sx__time-grid-event");
    expect(Number.parseFloat(reserva?.style.top ?? "")).toBeCloseTo((30 / 330) * 100, 5);
    expect(Number.parseFloat(reserva?.style.height ?? "")).toBeCloseTo((180 / 330) * 100, 5);
    app.destroy();
    arrel.remove();
    vi.unstubAllGlobals();
  });
});
