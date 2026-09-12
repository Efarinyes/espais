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
