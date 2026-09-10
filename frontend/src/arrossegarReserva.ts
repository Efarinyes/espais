import "temporal-polyfill/global";

import { arrodoneixInici } from "./calendari";
import { minutsDeHora } from "./disponibilitat";

export function zonedDesDePuntGraella(
  dataIso: string,
  yRelatiu: number,
  altura: number,
  start: string,
  end: string,
): Temporal.ZonedDateTime {
  const inici = minutsDeHora(start);
  const fi = minutsDeHora(end);
  const total = Math.max(fi - inici, 1);
  const ratio = altura <= 0 ? 0 : Math.min(1, Math.max(0, yRelatiu / altura));
  const minuts = inici + ratio * total;
  const hour = Math.min(23, Math.max(0, Math.floor(minuts / 60)));
  const minute = Math.min(59, Math.max(0, Math.floor(minuts - hour * 60)));
  const zoned = Temporal.PlainDate.from(dataIso).toZonedDateTime({
    timeZone: "Europe/Madrid",
    plainTime: Temporal.PlainTime.from({ hour, minute }),
  });
  return arrodoneixInici(zoned);
}

export function diaIsoDeElement(desti: EventTarget | null): string | null {
  if (!(desti instanceof Element)) {
    return null;
  }
  return desti.closest("[data-time-grid-date]")?.getAttribute("data-time-grid-date") ?? null;
}

export function reservaIdDeElement(desti: EventTarget | null): string | null {
  if (!(desti instanceof Element)) {
    return null;
  }
  return desti.closest("[data-event-id]")?.getAttribute("data-event-id") ?? null;
}
