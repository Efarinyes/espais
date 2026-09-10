import type { RolSessio } from "./services/identitat";
import type { ReservaDto } from "./services/reserves";
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

export function titolReserva(item: ReservaDto, role: RolSessio): string {
  if (!item.mine && role !== "responsible") {
    return "Ocupat";
  }
  if (role === "responsible") {
    return item.coordinator_name?.trim() || "Reserva";
  }
  return item.space_name?.trim() || "Tu";
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

const PALETA = [
  { main: "#1677A8", container: "#DFF3FA", onContainer: "#202A2E" },
  { main: "#C9922E", container: "#F2E5CC", onContainer: "#202A2E" },
  { main: "#657A35", container: "#E8F0D8", onContainer: "#202A2E" },
  { main: "#D83A4B", container: "#FADCE0", onContainer: "#202A2E" },
  { main: "#075985", container: "#D6EEF8", onContainer: "#202A2E" },
  { main: "#E97825", container: "#FDE4D0", onContainer: "#202A2E" },
  { main: "#7A5528", container: "#EFE0CC", onContainer: "#202A2E" },
] as const;

function colorNom(index: number): string {
  let n = index + 1;
  let nom = "";
  while (n > 0) {
    n -= 1;
    nom = String.fromCharCode(97 + (n % 26)) + nom;
    n = Math.floor(n / 26);
  }
  return `espai${nom}`;
}

export type ColorCalendari = {
  colorName: string;
  lightColors: { main: string; container: string; onContainer: string };
};

export function calendarisPerEspais(espais: { id: string }[]): Record<string, ColorCalendari> {
  return Object.fromEntries(
    espais.map((espai, index) => [
      espai.id,
      {
        colorName: colorNom(index),
        lightColors: { ...PALETA[index % PALETA.length] },
      },
    ]),
  );
}

export function horaMadrid(iso: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function dataHoraMadrid(iso: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
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
