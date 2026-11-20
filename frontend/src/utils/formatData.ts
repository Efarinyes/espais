export function horaMadrid(iso: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function intervalMadrid(inici: string, fi: string): string {
  const data = new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(inici));
  return `${data}, de ${horaMadrid(inici)} a ${horaMadrid(fi)}`;
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

/** «dj., 10 de set.»: el dia d’una reserva en una llista. */
export function diaMadrid(iso: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** «16:00–18:00». */
export function horariMadrid(inici: string, fi: string): string {
  return `${horaMadrid(inici)}–${horaMadrid(fi)}`;
}
