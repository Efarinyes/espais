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
  const franges = new Set(windows.map((finestra) => `${horaCurta(finestra.start)}–${horaCurta(finestra.end)}`));
  const etiq = windows
    .map((finestra) => DIES_SETMANA.find((dia) => dia.weekday === finestra.weekday)?.etiqueta ?? "")
    .filter(Boolean);
  if (windows.length === 7 && franges.size === 1) {
    return `Tots els dies ${[...franges][0]}`;
  }
  if (franges.size === 1) {
    return `${etiq.join(", ")} ${[...franges][0]}`;
  }
  return `${windows.length} finestres`;
}
