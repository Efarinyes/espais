import { inject, type InjectionKey } from "vue";

import { fetchApi } from "./http";

export type AvisDto = {
  id: string;
  type: string;
  reservation_id: string;
  entity_name: string;
  space_name: string;
  starts_at: string;
  ends_at: string;
  new_starts_at: string | null;
  new_ends_at: string | null;
  responsible_name: string;
  reason: string | null;
  read_at: string | null;
  created_at: string;
  /** Avisos nous: espai afectat i què ha canviat (`date`, `start_time`, `end_time`). */
  space_id?: string | null;
  changes?: string[];
};

export const AVIS_MODIFICADA = "reservation_rescheduled";
export const AVIS_ANULLADA = "reservation_cancelled";

export type AvisosApi = {
  llistar(token: string): Promise<AvisDto[]>;
  marcarLlegit(token: string, avisId: string): Promise<AvisDto>;
  arxivar(token: string, avisId: string): Promise<void>;
};

/** Títol visible de l’avís: diu clarament si la reserva s’ha modificat o anul·lat. */
export function titolReservaAvis(avis: Pick<AvisDto, "type" | "space_name">): string {
  const accio = avis.type === AVIS_MODIFICADA ? "modificada" : "anul·lada";
  return `Reserva ${accio}: ${avis.space_name}`;
}

export function titolAvis(avis: Pick<AvisDto, "type" | "space_name">): string {
  if (avis.type === "reservation_rescheduled") {
    return `Reserva reprogramada: ${avis.space_name}`;
  }
  return `Reserva anul·lada: ${avis.space_name}`;
}

/** Etiqueta curta del tipus d’avís: es llegeix sense mirar el color. */
export function etiquetaAvis(avis: Pick<AvisDto, "type">): string {
  return avis.type === AVIS_MODIFICADA ? "Modificada" : "Anul·lada";
}

export function missatgeAvis(avis: Pick<AvisDto, "type">): string {
  return avis.type === AVIS_MODIFICADA
    ? "Aquesta reserva ha estat modificada."
    : "Aquesta reserva ha estat anul·lada.";
}

const NOM_CANVI: Record<string, string> = {
  date: "el dia",
  start_time: "l’hora d’inici",
  end_time: "l’hora de fi",
};

/** «Ha canviat el dia i l’hora d’inici.» Buit si no hi ha canvis coneguts. */
export function descripcioCanvis(changes: readonly string[] | undefined): string {
  const noms = (changes ?? []).map((canvi) => NOM_CANVI[canvi]).filter((nom): nom is string => Boolean(nom));
  if (noms.length === 0) {
    return "";
  }
  const llista = noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(", ")} i ${noms[noms.length - 1]}`;
  return `Ha canviat ${llista}.`;
}

/** Dia (Europe/Madrid) en format ISO, per obrir el calendari a la reserva. */
export function diaMadrid(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date(iso));
}

/**
 * Enllaç al calendari de la reserva. Una reserva anul·lada ja no hi surt: no hi ha enllaç.
 * Una de modificada s’obre al dia nou.
 */
export function enllacReserva(avis: Pick<AvisDto, "type" | "starts_at" | "new_starts_at" | "space_id">) {
  if (avis.type !== AVIS_MODIFICADA) {
    return null;
  }
  const query: Record<string, string> = { data: diaMadrid(avis.new_starts_at ?? avis.starts_at) };
  if (avis.space_id) {
    query.espai = avis.space_id;
  }
  return { name: "calendari", query };
}

export const avisosApiKey: InjectionKey<AvisosApi> = Symbol("avisosApi");

export function requireAvisosApi(): AvisosApi {
  const api = inject(avisosApiKey);
  if (!api) {
    throw new Error("cal AvisosApi");
  }
  return api;
}

export function createAvisosApi(baseUrl = ""): AvisosApi {
  return {
    async llistar(token) {
      return fetchApi<AvisDto[]>(`${baseUrl}/avisos`, { token });
    },

    async marcarLlegit(token, avisId) {
      return fetchApi<AvisDto>(`${baseUrl}/avisos/${avisId}/llegit`, {
        method: "POST",
        token,
      });
    },

    async arxivar(token, avisId) {
      await fetchApi<void>(`${baseUrl}/avisos/${avisId}/arxivat`, {
        method: "POST",
        token,
      });
    },
  };
}
