import type { RolSessio } from "./services/identitat";
import type { ReservaDto } from "./services/reserves";
import { horaMadrid } from "./utils/formatData";
import "temporal-polyfill/global";

export type FranjaReserva = {
  starts_at: string;
  ends_at: string;
};

export function parseCompteAssistencia(valor: unknown): number | null {
  const text = String(valor ?? "").trim();
  if (text === "") {
    return null;
  }
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

const NOMBRE_TRAMATS = 6;

export type EntradaTramat = {
  nom: string;
  classe: string;
};

export type PersonaTramat = {
  nom: string;
  clau: string;
};

/** La mateixa persona conserva el patró. La clau és l’id; si no n’hi ha, el nom. Sis patrons: es poden repetir. */
export function classeTramat(clau: string): string {
  let hash = 2166136261;
  for (const char of clau.trim()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `reserva-tramat-${(hash >>> 0) % NOMBRE_TRAMATS}`;
}

export function llegendaTramats(persones: PersonaTramat[]): EntradaTramat[] {
  const perClau = new Map<string, string>();
  for (const persona of persones) {
    const nom = persona.nom.trim();
    const clau = persona.clau.trim() || nom;
    if (!nom || !clau || perClau.has(clau)) {
      continue;
    }
    perClau.set(clau, nom);
  }
  return [...perClau.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "ca") || a[0].localeCompare(b[0]))
    .map(([clau, nom]) => ({ nom, classe: classeTramat(clau) }));
}

export type AmbitVista = {
  rol: RolSessio;
  espaiId: string;
  coordinadorId: string;
};

/** Sense sala, el coordinador només veu les seves. Amb sala, només la disponibilitat d’aquella sala. */
export function reservaVisible(item: ReservaDto, ambit: AmbitVista): boolean {
  if (ambit.rol !== "responsible") {
    if (ambit.espaiId === "") {
      return item.mine;
    }
    return item.space_id === ambit.espaiId;
  }
  if (ambit.espaiId !== "" && item.space_id !== ambit.espaiId) {
    return false;
  }
  const coordinadorId = ambit.coordinadorId.trim();
  if (!coordinadorId) {
    return true;
  }
  return item.coordinator_id === coordinadorId;
}

export type PaperReserva = "teva" | "ocupada" | "altra";

export type FilaReserva = {
  id: string;
  data: string;
  espai: string;
  interval: string;
  propietat: string;
  paper: PaperReserva;
  obrible: boolean;
};

export function filaReserva(item: ReservaDto, rol: RolSessio): FilaReserva {
  const data = new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(item.starts_at));
  let propietat: string;
  let paper: PaperReserva;
  if (item.status === "cancelled") {
    propietat = "Anul·lada";
    paper = "altra";
  } else if (rol === "responsible") {
    propietat = item.coordinator_name?.trim() || "Reserva";
    paper = "altra";
  } else if (item.mine) {
    propietat = "Teva";
    paper = "teva";
  } else {
    propietat = "Ocupat";
    paper = "ocupada";
  }
  return {
    id: item.id,
    data,
    espai: item.space_name?.trim() || "Espai",
    interval: `${horaMadrid(item.starts_at)}–${horaMadrid(item.ends_at)}`,
    propietat,
    paper,
    obrible: item.mine || rol === "responsible",
  };
}

export function cobreixInstant(reserva: Pick<ReservaDto, "starts_at" | "ends_at">, instant: Temporal.Instant): boolean {
  const inici = Temporal.Instant.from(reserva.starts_at);
  const fi = Temporal.Instant.from(reserva.ends_at);
  return Temporal.Instant.compare(instant, inici) >= 0 && Temporal.Instant.compare(instant, fi) < 0;
}

const ZONA_CALENDARI = "Europe/Madrid";

function instantLimit(dia: Temporal.PlainDate, hora: string, esFi: boolean): Temporal.ZonedDateTime {
  if (esFi && hora.startsWith("24:")) {
    return Temporal.ZonedDateTime.from({
      timeZone: ZONA_CALENDARI,
      year: dia.year,
      month: dia.month,
      day: dia.day,
      hour: 23,
      minute: 59,
    });
  }
  const [hour, minute] = hora.split(":").map((part) => Number(part));
  return Temporal.ZonedDateTime.from({
    timeZone: ZONA_CALENDARI,
    year: dia.year,
    month: dia.month,
    day: dia.day,
    hour,
    minute,
  });
}

/** El mateix interval que la graella: setmana de dilluns a diumenge, o el dia, amb els límits horaris. */
export function rangVisible(
  dia: Temporal.PlainDate,
  unDia: boolean,
  iniciHora: string,
  fiHora: string,
): { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime } {
  if (unDia) {
    return { start: instantLimit(dia, iniciHora, false), end: instantLimit(dia, fiHora, true) };
  }
  const dilluns = dia.subtract({ days: dia.dayOfWeek - 1 });
  const diumenge = dilluns.add({ days: 6 });
  return { start: instantLimit(dilluns, iniciHora, false), end: instantLimit(diumenge, fiHora, true) };
}

export function etiquetaPeriode(dia: Temporal.PlainDate, unDia: boolean): string {
  const format = new Intl.DateTimeFormat("ca-ES", {
    timeZone: ZONA_CALENDARI,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (unDia) {
    return new Intl.DateTimeFormat("ca-ES", {
      timeZone: ZONA_CALENDARI,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dia.toZonedDateTime(ZONA_CALENDARI).toInstant().epochMilliseconds);
  }
  const dilluns = dia.subtract({ days: dia.dayOfWeek - 1 });
  const diumenge = dilluns.add({ days: 6 });
  const aMilis = (data: Temporal.PlainDate) => data.toZonedDateTime(ZONA_CALENDARI).toInstant().epochMilliseconds;
  return `${format.format(aMilis(dilluns))} – ${format.format(aMilis(diumenge))}`;
}

export function titolReserva(item: ReservaDto, role: RolSessio, salaSeleccionada = false): string {
  if (!item.mine && role !== "responsible") {
    return "Ocupat";
  }
  if (role === "responsible") {
    return item.coordinator_name?.trim() || "Reserva";
  }
  if (salaSeleccionada) {
    return "Teva";
  }
  return item.space_name?.trim() || "Tu";
}

export function clauTramat(item: ReservaDto): string {
  return item.coordinator_id?.trim() || item.coordinator_name?.trim() || "";
}

export function classesReserva(item: ReservaDto, role: RolSessio): string[] {
  if (role === "responsible") {
    const clau = clauTramat(item);
    return clau ? [classeTramat(clau)] : [];
  }
  return [item.mine ? "reserva-propia" : "reserva-ocupada"];
}

export function nomAccessibleReserva(item: ReservaDto, role: RolSessio, salaSeleccionada = false): string {
  const quan = new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(item.starts_at));
  const fi = new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(item.ends_at));
  const interval = `${quan} a ${fi}`;
  const espai = item.space_name?.trim() || "Espai";
  if (!item.mine && role !== "responsible") {
    return `Ocupat, ${espai}, ${interval}`;
  }
  if (role === "responsible") {
    const qui = item.coordinator_name?.trim() || "Reserva";
    return `${espai}, ${qui}, ${interval}`;
  }
  if (salaSeleccionada) {
    return `Teva, ${espai}, ${interval}`;
  }
  return `${espai}, ${interval}`;
}

export const DURADES_RESERVA_MINUTS = [30, 60, 90, 120, 180] as const;
export const DURADA_PER_DEFECTE_MINUTS = 60;

export function etiquetaDurada(minuts: number): string {
  if (minuts < 60) {
    return `${minuts} min`;
  }
  const hores = Math.floor(minuts / 60);
  const resta = minuts % 60;
  if (resta === 0) {
    return hores === 1 ? "1 h" : `${hores} h`;
  }
  return `${hores} h ${resta} min`;
}

export function arrodoneixInici(dateTime: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  const minute = dateTime.minute < 30 ? 0 : 30;
  return dateTime.with({
    minute,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });
}

export function franjaDesDeInici(
  inici: Temporal.ZonedDateTime,
  duradaMinuts: number = DURADA_PER_DEFECTE_MINUTS,
): FranjaReserva {
  const start = arrodoneixInici(inici);
  return {
    starts_at: start.toInstant().toString(),
    ends_at: start.add({ minutes: duradaMinuts }).toInstant().toString(),
  };
}

export function arrodoneixClicAFranja(
  dateTime: Temporal.ZonedDateTime,
  duradaMinuts: number = DURADA_PER_DEFECTE_MINUTS,
): FranjaReserva {
  return franjaDesDeInici(dateTime, duradaMinuts);
}

export function valorRangAIso(valor: unknown): string {
  if (valor && typeof valor === "object" && "toInstant" in valor && typeof valor.toInstant === "function") {
    return (valor as Temporal.ZonedDateTime).toInstant().toString();
  }
  if (valor && typeof valor === "object" && "epochNanoseconds" in valor) {
    return Temporal.Instant.fromEpochNanoseconds(
      (valor as Temporal.Instant).epochNanoseconds,
    ).toString();
  }
  const text = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return Temporal.PlainDate.from(text).toZonedDateTime("Europe/Madrid").toInstant().toString();
  }
  return Temporal.Instant.from(text.replace(" ", "T")).toString();
}
