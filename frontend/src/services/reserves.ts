import { inject, type InjectionKey } from "vue";

import { ApiError } from "./identitat";

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
  llistar(token: string, des: string, fins: string, espaiId?: string): Promise<ReservaDto[]>;
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

async function detallError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    /* ignore */
  }
  return "S’ha produït un error.";
}

export function createReservesApi(baseUrl = ""): ReservesApi {
  function headers(token: string, json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (json) {
      h["Content-Type"] = "application/json";
    }
    return h;
  }

  return {
    async llistar(token, des, fins, espaiId) {
      const params = new URLSearchParams({ des, fins });
      if (espaiId) {
        params.set("espai_id", espaiId);
      }
      const res = await fetch(`${baseUrl}/reserves?${params.toString()}`, { headers: headers(token) });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as ReservaDto[];
    },

    async crear(token, input) {
      const res = await fetch(`${baseUrl}/reserves`, {
        method: "POST",
        headers: headers(token, true),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as ReservaDto;
    },

    async registrarAssistencia(token, reservaId, count) {
      const res = await fetch(`${baseUrl}/reserves/${reservaId}/assistencia`, {
        method: "PUT",
        headers: headers(token, true),
        body: JSON.stringify({ count }),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as ReservaDto;
    },

    async anular(token, reservaId, reason) {
      const res = await fetch(`${baseUrl}/reserves/${reservaId}/anulacio`, {
        method: "POST",
        headers: headers(token, true),
        body: JSON.stringify({ reason: reason ?? null }),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as ReservaDto;
    },

    async reprogramar(token, reservaId, input) {
      const res = await fetch(`${baseUrl}/reserves/${reservaId}/reprogramacio`, {
        method: "POST",
        headers: headers(token, true),
        body: JSON.stringify({
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          reason: input.reason ?? null,
        }),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as ReservaDto;
    },
  };
}
