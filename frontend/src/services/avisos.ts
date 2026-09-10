import { inject, type InjectionKey } from "vue";

import { ApiError } from "./identitat";

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

export function createAvisosApi(baseUrl = ""): AvisosApi {
  function headers(token: string, json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (json) {
      h["Content-Type"] = "application/json";
    }
    return h;
  }

  return {
    async llistar(token) {
      const res = await fetch(`${baseUrl}/avisos`, { headers: headers(token) });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as AvisDto[];
    },

    async marcarLlegit(token, avisId) {
      const res = await fetch(`${baseUrl}/avisos/${avisId}/llegit`, {
        method: "POST",
        headers: headers(token),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as AvisDto;
    },
  };
}
