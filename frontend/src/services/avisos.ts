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
};

export type AvisosApi = {
  llistar(token: string): Promise<AvisDto[]>;
  marcarLlegit(token: string, avisId: string): Promise<AvisDto>;
  arxivar(token: string, avisId: string): Promise<void>;
};

export function titolAvis(avis: Pick<AvisDto, "type" | "space_name">): string {
  if (avis.type === "reservation_rescheduled") {
    return `Reserva reprogramada: ${avis.space_name}`;
  }
  return `Reserva anul·lada: ${avis.space_name}`;
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
