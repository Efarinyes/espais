export type VistaCalendari = "graella" | "llista";

export type ConsultaCalendari = {
  espai: string;
  cerca: string;
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
    cerca: textQuery(query.cerca),
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
    if (clau === "espai" || clau === "cerca" || clau === "vista") {
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
  if (fusion.cerca) {
    sortida.cerca = fusion.cerca;
  }
  if (fusion.vista === "llista") {
    sortida.vista = "llista";
  }
  return sortida;
}
