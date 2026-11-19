import { inject, type InjectionKey } from "vue";

import { fetchApi } from "./http";

/** Avís que el responsable ha provocat. `read_at` és la lectura dins d’Espais, no la del push. */
export type AvisEnviatDto = {
  id: string;
  type: string;
  reservation_id: string;
  coordinator_name: string | null;
  space_name: string;
  starts_at: string;
  ends_at: string;
  new_starts_at: string | null;
  new_ends_at: string | null;
  changes: string[];
  reservation_status: string | null;
  created_at: string;
  read_at: string | null;
};

export type AvisosEnviatsApi = {
  llistar(token: string): Promise<AvisEnviatDto[]>;
};

export const avisosEnviatsApiKey: InjectionKey<AvisosEnviatsApi> = Symbol("avisosEnviatsApi");

export function requireAvisosEnviatsApi(): AvisosEnviatsApi {
  const api = inject(avisosEnviatsApiKey);
  if (!api) {
    throw new Error("cal AvisosEnviatsApi");
  }
  return api;
}

export function createAvisosEnviatsApi(baseUrl = ""): AvisosEnviatsApi {
  return {
    async llistar(token) {
      return fetchApi<AvisEnviatDto[]>(`${baseUrl}/avisos/enviats`, { token });
    },
  };
}
