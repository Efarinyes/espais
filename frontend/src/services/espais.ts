import { inject, type InjectionKey } from "vue";

import type { FinestraDto } from "../disponibilitat";
import { fetchApi } from "./http";

export type EspaiDto = {
  id: string;
  entity_id: string;
  name: string;
  capacity: number;
  equipment: string | null;
  active: boolean;
  windows: FinestraDto[];
};

export type CreaEspaiInput = {
  name: string;
  capacity: number;
  equipment: string;
  windows: FinestraDto[];
};

export type ActualitzaEspaiInput = CreaEspaiInput & {
  active: boolean;
};

export type EspaisApi = {
  llistar(token: string): Promise<EspaiDto[]>;
  obtenir(token: string, id: string): Promise<EspaiDto>;
  crear(token: string, input: CreaEspaiInput): Promise<EspaiDto>;
  actualitzar(token: string, id: string, input: ActualitzaEspaiInput): Promise<EspaiDto>;
};

export const espaisApiKey: InjectionKey<EspaisApi> = Symbol("espaisApi");

export function requireEspaisApi(): EspaisApi {
  const api = inject(espaisApiKey);
  if (!api) {
    throw new Error("cal EspaisApi");
  }
  return api;
}

export function createEspaisApi(baseUrl = ""): EspaisApi {
  return {
    async llistar(token) {
      return fetchApi<EspaiDto[]>(`${baseUrl}/espais`, { token });
    },

    async obtenir(token, id) {
      return fetchApi<EspaiDto>(`${baseUrl}/espais/${id}`, { token });
    },

    async crear(token, input) {
      return fetchApi<EspaiDto>(`${baseUrl}/espais`, {
        method: "POST",
        token,
        body: JSON.stringify({
          name: input.name,
          capacity: input.capacity,
          equipment: input.equipment || null,
          windows: input.windows,
        }),
      });
    },

    async actualitzar(token, id, input) {
      return fetchApi<EspaiDto>(`${baseUrl}/espais/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: input.name,
          capacity: input.capacity,
          equipment: input.equipment || null,
          active: input.active,
          windows: input.windows,
        }),
      });
    },
  };
}
