import "temporal-polyfill/global";

export const FUS_HORARI_PER_DEFECTE = "Europe/Madrid";

export function mesEnCursTimeZone(
  timeZone: string = FUS_HORARI_PER_DEFECTE,
  ara: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(timeZone),
): string {
  const local = ara.withTimeZone(timeZone);
  return `${local.year.toString().padStart(4, "0")}-${local.month.toString().padStart(2, "0")}`;
}

export function periodeDelMes(
  yyyyMm: string,
  timeZone: string = FUS_HORARI_PER_DEFECTE,
): { des: string; fins: string } {
  const [yearText, monthText] = yyyyMm.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const inici = Temporal.ZonedDateTime.from({
    timeZone,
    year,
    month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const fi = inici.add({ months: 1 });
  return { des: inici.toInstant().toString(), fins: fi.toInstant().toString() };
}

export function percentatgeOcupacio(ratio: number): string {
  return `${(ratio * 100).toLocaleString("ca-ES", { maximumFractionDigits: 1, minimumFractionDigits: 0 })} %`;
}

export function horesEtiqueta(hores: number): string {
  return `${hores.toLocaleString("ca-ES", { maximumFractionDigits: 1, minimumFractionDigits: 0 })} h`;
}

type ResumEspai = {
  space_id: string;
  space_name: string;
  confirmed_count: number;
  reserved_hours: number;
  occupancy_ratio: number;
};

function perNom(a: { space_name: string }, b: { space_name: string }): number {
  return a.space_name.localeCompare(b.space_name, "ca");
}

/** Hores disponibles que no s’han reservat. No pot ser negativa si hi ha més reserves que horari. */
export function horesLliures(reservades: number, disponibles: number): number {
  return Math.max(0, disponibles - reservades);
}

/** Sense horari de disponibilitat no hi ha cap ocupació a calcular (el back respon 0, que no és un valor real). */
export function senseHoresDisponibles(disponibles: number): boolean {
  return disponibles <= 0;
}

/** Els espais de més a menys ocupació; a igualtat, més reserves i després el nom. */
export function espaisPerOcupacio<T extends ResumEspai>(espais: readonly T[]): T[] {
  return [...espais].sort(
    (a, b) =>
      b.occupancy_ratio - a.occupancy_ratio ||
      b.confirmed_count - a.confirmed_count ||
      perNom(a, b),
  );
}

/** L’espai amb més reserves confirmades; a igualtat, més hores reservades i després el nom. Sense cap reserva, cap. */
export function espaiMesActiu<T extends ResumEspai>(espais: readonly T[]): T | null {
  const ordenats = [...espais].sort(
    (a, b) =>
      b.confirmed_count - a.confirmed_count ||
      b.reserved_hours - a.reserved_hours ||
      perNom(a, b),
  );
  const primer = ordenats[0];
  return primer && primer.confirmed_count > 0 ? primer : null;
}

/** Reserves confirmades per espai, de més a menys. Els espais sense cap reserva no hi surten. */
export function repartimentReserves<T extends ResumEspai>(espais: readonly T[]): T[] {
  return espais
    .filter((espai) => espai.confirmed_count > 0)
    .sort((a, b) => b.confirmed_count - a.confirmed_count || perNom(a, b));
}

/** Reserves confirmades amb un nombre d’assistents desat (el 0 també és un registre). */
export function reservesAmbAssistencia(confirmades: number, senseRegistrar: number): number {
  return Math.max(0, confirmades - senseRegistrar);
}

/** Part d’un total en tant per u, limitada a 0–1. Sense total, 0. */
export function fraccio(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, part / total));
}

export function nombreEtiqueta(valor: number): string {
  return valor.toLocaleString("ca-ES", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

export function assistenciaEtiqueta(
  mitjana: number | null,
  senseRegistrar: number,
): string {
  if (mitjana == null) {
    return senseRegistrar > 0 ? "Sense registrar" : "—";
  }
  const xifra = mitjana.toLocaleString("ca-ES", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  if (senseRegistrar > 0) {
    return `${xifra} (${senseRegistrar} sense registrar)`;
  }
  return xifra;
}
