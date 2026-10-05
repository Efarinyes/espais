import "temporal-polyfill/global";

export type FinestraDto = {
  weekday: number;
  start: string;
  end: string;
};

export type DiaHorari = {
  weekday: number;
  etiqueta: string;
  actiu: boolean;
  start: string;
  end: string;
};

export const DIES_SETMANA: { weekday: number; etiqueta: string }[] = [
  { weekday: 0, etiqueta: "Dilluns" },
  { weekday: 1, etiqueta: "Dimarts" },
  { weekday: 2, etiqueta: "Dimecres" },
  { weekday: 3, etiqueta: "Dijous" },
  { weekday: 4, etiqueta: "Divendres" },
  { weekday: 5, etiqueta: "Dissabte" },
  { weekday: 6, etiqueta: "Diumenge" },
];

const OBERTURA = "08:00";
const TANCAMENT = "22:00";

export function horaCurta(valor: string): string {
  return valor.slice(0, 5);
}

export function finestresPerDefecte(): FinestraDto[] {
  return diesAFinestres(diesPerDefecte());
}

export function diesPerDefecte(): DiaHorari[] {
  return DIES_SETMANA.map((dia) => ({
    weekday: dia.weekday,
    etiqueta: dia.etiqueta,
    actiu: true,
    start: OBERTURA,
    end: TANCAMENT,
  }));
}

export function finestresADies(windows: FinestraDto[] | null | undefined): DiaHorari[] {
  const llista = windows ?? [];
  const perDia = new Map(llista.map((finestra) => [finestra.weekday, finestra]));
  return DIES_SETMANA.map((dia) => {
    const finestra = perDia.get(dia.weekday);
    return {
      weekday: dia.weekday,
      etiqueta: dia.etiqueta,
      actiu: finestra !== undefined,
      start: finestra ? horaCurta(finestra.start) : OBERTURA,
      end: finestra ? horaCurta(finestra.end) : TANCAMENT,
    };
  });
}

export function diesAFinestres(dies: DiaHorari[]): FinestraDto[] {
  return dies
    .filter((dia) => dia.actiu)
    .map((dia) => ({ weekday: dia.weekday, start: dia.start, end: dia.end }));
}

export function validaDies(dies: DiaHorari[]): string {
  const actius = dies.filter((dia) => dia.actiu);
  if (actius.length === 0) {
    return "Cal almenys un dia amb horari.";
  }
  if (actius.some((dia) => dia.start >= dia.end)) {
    return "L’hora d’inici ha de ser anterior a la de fi.";
  }
  return "";
}

export function resumFinestres(windows: FinestraDto[] | null | undefined): string {
  if (!windows?.length) {
    return "Sense horari";
  }
  const ambEtiqueta = windows
    .map((finestra) => {
      const etiqueta = DIES_SETMANA.find((dia) => dia.weekday === finestra.weekday)?.etiqueta ?? "";
      return { etiqueta, franja: `${horaCurta(finestra.start)}–${horaCurta(finestra.end)}` };
    })
    .filter((item) => item.etiqueta);
  const franges = new Set(ambEtiqueta.map((item) => item.franja));
  if (windows.length === 7 && franges.size === 1) {
    return `Tots els dies ${[...franges][0]}`;
  }
  if (franges.size === 1) {
    return `${uneixNoms(ambEtiqueta.map((item) => item.etiqueta))} ${[...franges][0]}`;
  }
  return ambEtiqueta.map((item) => `${item.etiqueta} ${item.franja}`).join(", ");
}

function uneixNoms(noms: string[]): string {
  if (noms.length <= 1) {
    return noms[0] ?? "";
  }
  if (noms.length === 2) {
    return `${noms[0]} i ${noms[1]}`;
  }
  return `${noms.slice(0, -1).join(", ")} i ${noms[noms.length - 1]}`;
}

export const PIXELS_PER_HORA = 88;
const PROXIMITAT_FINESTRA_MINUTS = 30;
const GRAELLA_DEFECTE = { start: OBERTURA, end: TANCAMENT };

export function weekdayDelModel(data: { dayOfWeek: number }): number {
  return data.dayOfWeek - 1;
}

export function envolupantHorari(windows: FinestraDto[] | null | undefined): { start: string; end: string } {
  const llista = windows ?? [];
  if (llista.length === 0) {
    return { ...GRAELLA_DEFECTE };
  }
  let start = "24:00";
  let end = "00:00";
  for (const finestra of llista) {
    const inici = horaCurta(finestra.start);
    const fi = horaCurta(finestra.end);
    if (inici < start) {
      start = inici;
    }
    if (fi > end) {
      end = fi;
    }
  }
  return { start, end };
}

export function diaObert(windows: FinestraDto[] | null | undefined, weekday: number): boolean {
  return (windows ?? []).some((finestra) => Number(finestra.weekday) === weekday);
}

export function diesOberts(windows: FinestraDto[] | null | undefined): { weekday: number; etiqueta: string }[] {
  return DIES_SETMANA.filter((dia) => diaObert(windows, dia.weekday));
}

export function attrDiesTancats(windows: FinestraDto[] | null | undefined): string {
  return DIES_SETMANA.filter((dia) => !diaObert(windows, dia.weekday))
    .map((dia) => String(dia.weekday))
    .join(" ");
}

export function minutsDeHora(hora: string): number {
  const [h, m] = horaCurta(hora).split(":").map(Number);
  return h * 60 + m;
}

export function alcadaGraella(start: string, end: string): number {
  const hores = (minutsDeHora(end) - minutsDeHora(start)) / 60;
  return Math.max(hores, 1) * PIXELS_PER_HORA;
}

export function horaSenceraAvall(hora: string): string {
  const hores = Math.floor(minutsDeHora(hora) / 60);
  return `${String(Math.max(0, hores)).padStart(2, "0")}:00`;
}

export function horaSenceraAmunt(hora: string): string {
  const minuts = minutsDeHora(hora);
  const hores = minuts % 60 === 0 ? minuts / 60 : Math.ceil(minuts / 60);
  if (hores >= 24) {
    return "24:00";
  }
  return `${String(hores).padStart(2, "0")}:00`;
}

export function finestresDelsEspais(
  espais: { windows?: FinestraDto[] | null }[] | null | undefined,
): FinestraDto[] {
  return (espais ?? []).flatMap((espai) => espai.windows ?? []);
}

const MINUTS_DIA = 24 * 60;
const MARGE_HORARI_MINUTS = 30;

function horaDesDeMinuts(minuts: number): string {
  const limitats = Math.min(MINUTS_DIA, Math.max(0, minuts));
  if (limitats === MINUTS_DIA) {
    return "24:00";
  }
  const hores = Math.floor(limitats / 60);
  return `${String(hores).padStart(2, "0")}:00`;
}

function minutsAHora(minuts: number): string {
  const limitats = Math.min(MINUTS_DIA, Math.max(0, minuts));
  if (limitats === MINUTS_DIA) {
    return "24:00";
  }
  const hores = Math.floor(limitats / 60);
  const resta = limitats % 60;
  return `${String(hores).padStart(2, "0")}:${String(resta).padStart(2, "0")}`;
}

export type Graella = {
  start: string;
  end: string;
  gridHeight: number;
  margeInici: boolean;
  margeFi: boolean;
  minutsMargeInici: number;
  minutsMargeFi: number;
};

export function configGraella(windows: FinestraDto[] | null | undefined): Graella;
export function configGraella(windows: FinestraDto[] | null | undefined, weekday: number): Graella | null;
export function configGraella(
  windows: FinestraDto[] | null | undefined,
  weekday?: number,
): Graella | null {
  const llista = windows ?? [];
  const delDia =
    weekday === undefined ? llista : llista.filter((finestra) => Number(finestra.weekday) === weekday);
  if (weekday !== undefined && delDia.length === 0) {
    return null;
  }
  const envolupant = envolupantHorari(delDia);
  const obertura = minutsDeHora(envolupant.start);
  const tancament = minutsDeHora(envolupant.end);
  const ambInici = Math.max(0, obertura - MARGE_HORARI_MINUTS);
  const ambFi = Math.min(MINUTS_DIA, tancament + MARGE_HORARI_MINUTS);
  const inici = minutsDeHora(horaSenceraAvall(minutsAHora(ambInici)));
  const fi = minutsDeHora(horaSenceraAmunt(minutsAHora(ambFi)));
  const start = horaDesDeMinuts(inici);
  const end = horaDesDeMinuts(fi);
  const minutsMargeInici = Math.max(0, obertura - inici);
  const minutsMargeFi = Math.max(0, fi - tancament);
  return {
    start,
    end,
    gridHeight: alcadaGraella(start, end),
    margeInici: minutsMargeInici > 0,
    margeFi: minutsMargeFi > 0,
    minutsMargeInici,
    minutsMargeFi,
  };
}

export function finestresPerRol(
  esResponsable: boolean,
  espaiSeleccionat: { windows?: FinestraDto[] | null } | null | undefined,
  espaisActius: { windows?: FinestraDto[] | null }[] | null | undefined,
): FinestraDto[] {
  if (!esResponsable && espaiSeleccionat) {
    return espaiSeleccionat.windows ?? [];
  }
  return finestresDelsEspais(espaisActius);
}

export function graellaDelRol(
  windows: FinestraDto[] | null | undefined,
  esResponsable: boolean,
  unDia: boolean,
  weekday: number,
): Graella {
  if (!esResponsable && unDia) {
    return configGraella(windows, weekday) ?? configGraella(windows);
  }
  return configGraella(windows);
}

export function finestraDelDia(
  windows: FinestraDto[] | null | undefined,
  weekday: number,
): FinestraDto | null {
  return (windows ?? []).find((finestra) => Number(finestra.weekday) === weekday) ?? null;
}

export function clicDinsFinestra(
  windows: FinestraDto[] | null | undefined,
  dateTime: Temporal.ZonedDateTime,
  duradaMinuts: number,
): boolean {
  const finestra = finestraDelDia(windows, weekdayDelModel(dateTime));
  if (!finestra) {
    return false;
  }
  const inici = dateTime.hour * 60 + dateTime.minute;
  return inici >= minutsDeHora(finestra.start) && inici + duradaMinuts <= minutsDeHora(finestra.end);
}

export function encaixaClicAFinestra(
  windows: FinestraDto[] | null | undefined,
  dateTime: Temporal.ZonedDateTime,
  duradaMinuts: number,
): Temporal.ZonedDateTime | null {
  const finestra = finestraDelDia(windows, weekdayDelModel(dateTime));
  if (!finestra) {
    return null;
  }
  const winStart = minutsDeHora(finestra.start);
  const winEnd = minutsDeHora(finestra.end);
  const clic = dateTime.hour * 60 + dateTime.minute;
  if (clic >= winStart && clic + duradaMinuts <= winEnd) {
    return dateTime.with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  }
  if (clic < winStart && winStart - clic <= PROXIMITAT_FINESTRA_MINUTS && winStart + duradaMinuts <= winEnd) {
    const [hour, minute] = horaCurta(finestra.start).split(":").map(Number);
    return dateTime.with({ hour, minute, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  }
  return null;
}

export function proximaDataDelWeekday(desDe: Temporal.PlainDate, weekday: number): Temporal.PlainDate {
  const actual = weekdayDelModel(desDe);
  const delta = (weekday - actual + 7) % 7;
  return desDe.add({ days: delta });
}

export function properDiaObert(
  windows: FinestraDto[] | null | undefined,
  desDe: Temporal.PlainDate,
): Temporal.PlainDate {
  for (let delta = 0; delta < 7; delta += 1) {
    const data = desDe.add({ days: delta });
    if (diaObert(windows, weekdayDelModel(data))) {
      return data;
    }
  }
  return desDe;
}

export function diaObertAnterior(
  windows: FinestraDto[] | null | undefined,
  desDe: Temporal.PlainDate,
): Temporal.PlainDate {
  for (let delta = 0; delta < 7; delta += 1) {
    const data = desDe.subtract({ days: delta });
    if (diaObert(windows, weekdayDelModel(data))) {
      return data;
    }
  }
  return desDe;
}

export function diaEnDireccio(
  windows: FinestraDto[] | null | undefined,
  desDe: Temporal.PlainDate,
  endavant: boolean,
): Temporal.PlainDate {
  if (diesOberts(windows).length === 0 || diaObert(windows, weekdayDelModel(desDe))) {
    return desDe;
  }
  return endavant ? properDiaObert(windows, desDe) : diaObertAnterior(windows, desDe);
}
