import { inject, type InjectionKey } from "vue";

import { fetchApi } from "./http";

export type ReservaDto = {
  id: string;
  space_id: string;
  space_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  mine: boolean;
  coordinator_name: string | null;
  attendance_count: number | null;
  capacity: number;
  min_attendance: number | null;
  exceeds_capacity: boolean;
  below_min_attendance: boolean;
};

export type CreaReservaInput = {
  space_id: string;
  starts_at: string;
  ends_at: string;
};

export type ReservesApi = {
  llistar(
    token: string,
    des: string,
    fins: string,
    espaiId?: string,
    inclouAnulades?: boolean,
  ): Promise<ReservaDto[]>;
  crear(token: string, input: CreaReservaInput): Promise<ReservaDto>;
  registrarAssistencia(token: string, reservaId: string, count: number): Promise<ReservaDto>;
  anular(token: string, reservaId: string, reason?: string): Promise<ReservaDto>;
  reprogramar(
    token: string,
    reservaId: string,
    input: { starts_at: string; ends_at: string; reason?: string },
  ): Promise<ReservaDto>;
};

export const reservesApiKey: InjectionKey<ReservesApi> = Symbol("reservesApi");

export function requireReservesApi(): ReservesApi {
  const api = inject(reservesApiKey);
  if (!api) {
    throw new Error("cal ReservesApi");
  }
  return api;
}

export function createReservesApi(baseUrl = ""): ReservesApi {
  return {
    async llistar(token, des, fins, espaiId, inclouAnulades) {
      const params = new URLSearchParams({ des, fins });
      if (espaiId) {
        params.set("espai_id", espaiId);
      }
      if (inclouAnulades) {
        params.set("inclou_anulades", "true");
      }
      return fetchApi<ReservaDto[]>(`${baseUrl}/reserves?${params.toString()}`, { token });
    },

    async crear(token, input) {
      return fetchApi<ReservaDto>(`${baseUrl}/reserves`, {
        method: "POST",
        token,
        body: JSON.stringify(input),
      });
    },

    async registrarAssistencia(token, reservaId, count) {
      return fetchApi<ReservaDto>(`${baseUrl}/reserves/${reservaId}/assistencia`, {
        method: "PUT",
        token,
        body: JSON.stringify({ count }),
      });
    },

    async anular(token, reservaId, reason) {
      return fetchApi<ReservaDto>(`${baseUrl}/reserves/${reservaId}/anulacio`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason: reason ?? null }),
      });
    },

    async reprogramar(token, reservaId, input) {
      return fetchApi<ReservaDto>(`${baseUrl}/reserves/${reservaId}/reprogramacio`, {
        method: "POST",
        token,
        body: JSON.stringify({
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          reason: input.reason ?? null,
        }),
      });
    },
  };
}
