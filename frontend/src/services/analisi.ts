import { inject, type InjectionKey } from "vue";

import { fetchApi } from "./http";

export type EspaiUsDto = {
  space_id: string;
  space_name: string;
  capacity: number;
  min_attendance: number | null;
  confirmed_count: number;
  cancelled_count: number;
  reserved_hours: number;
  available_hours: number;
  occupancy_ratio: number;
  average_attendance: number | null;
  unregistered_count: number;
  below_min_attendance: boolean;
};

export type ResumUsDto = {
  starts_at: string;
  ends_at: string;
  confirmed_count: number;
  cancelled_count: number;
  reserved_hours: number;
  available_hours: number;
  occupancy_ratio: number;
  average_attendance: number | null;
  unregistered_count: number;
  below_min_attendance: boolean;
  spaces: EspaiUsDto[];
};

export type AnalisiApi = {
  resum(token: string, des: string, fins: string, espaiId?: string): Promise<ResumUsDto>;
};

export const analisiApiKey: InjectionKey<AnalisiApi> = Symbol("analisiApi");

export function requireAnalisiApi(): AnalisiApi {
  const api = inject(analisiApiKey);
  if (!api) {
    throw new Error("cal AnalisiApi");
  }
  return api;
}

export function createAnalisiApi(baseUrl = ""): AnalisiApi {
  return {
    async resum(token, des, fins, espaiId) {
      const params = new URLSearchParams({ des, fins });
      if (espaiId) {
        params.set("espai_id", espaiId);
      }
      return fetchApi<ResumUsDto>(`${baseUrl}/analisi?${params.toString()}`, { token });
    },
  };
}
