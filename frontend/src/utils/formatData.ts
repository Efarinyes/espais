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
