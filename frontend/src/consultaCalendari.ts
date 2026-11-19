export type VistaCalendari = "graella" | "llista";

export type ConsultaCalendari = {
  espai: string;
  coordinador: string;
  vista: VistaCalendari;
};

function textQuery(valor: unknown): string {
  if (typeof valor === "string") {
    return valor;
  }
  if (Array.isArray(valor) && typeof valor[0] === "string") {
    return valor[0];
  }
  return "";
}

export function consultaCalendari(query: Record<string, unknown>): ConsultaCalendari {
  return {
    espai: textQuery(query.espai),
    coordinador: textQuery(query.coordinador),
    vista: query.vista === "llista" ? "llista" : "graella",
  };
}

/** Escriu només els paràmetres amb valor. La graella és l’absència de `vista`. */
export function queryCalendari(
  actual: Record<string, unknown>,
  canvi: Partial<ConsultaCalendari>,
): Record<string, string> {
  const fusion = consultaCalendari({ ...actual, ...canvi });
  const sortida: Record<string, string> = {};
  for (const [clau, valor] of Object.entries(actual)) {
    if (clau === "espai" || clau === "cerca" || clau === "coordinador" || clau === "vista") {
      continue;
    }
    const text = textQuery(valor);
    if (text) {
      sortida[clau] = text;
    }
  }
  if (fusion.espai) {
    sortida.espai = fusion.espai;
  }
  if (fusion.coordinador) {
    sortida.coordinador = fusion.coordinador;
  }
  if (fusion.vista === "llista") {
    sortida.vista = "llista";
  }
  return sortida;
}

/** Dia demanat per l’enllaç d’un avís (`?data=AAAA-MM-DD`); `null` si no és una data vàlida. */
export function diaDeQuery(query: Record<string, unknown>): string | null {
  const text = textQuery(query.data);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}
