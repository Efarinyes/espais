import { inject, type InjectionKey } from "vue";

import { ApiError } from "./identitat";

export type EspaiDto = {
  id: string;
  entity_id: string;
  name: string;
  capacity: number;
  equipment: string | null;
  active: boolean;
};

export type CreaEspaiInput = {
  name: string;
  capacity: number;
  equipment: string;
};

export type EspaisApi = {
  llistar(token: string): Promise<EspaiDto[]>;
  crear(token: string, input: CreaEspaiInput): Promise<EspaiDto>;
};

export const espaisApiKey: InjectionKey<EspaisApi> = Symbol("espaisApi");

export function requireEspaisApi(): EspaisApi {
  const api = inject(espaisApiKey);
  if (!api) {
    throw new Error("cal EspaisApi");
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

export function createEspaisApi(baseUrl = ""): EspaisApi {
  function headers(token: string, json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (json) {
      h["Content-Type"] = "application/json";
    }
    return h;
  }

  return {
    async llistar(token) {
      const res = await fetch(`${baseUrl}/espais`, { headers: headers(token) });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as EspaiDto[];
    },

    async crear(token, input) {
      const res = await fetch(`${baseUrl}/espais`, {
        method: "POST",
        headers: headers(token, true),
        body: JSON.stringify({
          name: input.name,
          capacity: input.capacity,
          equipment: input.equipment || null,
        }),
      });
      if (!res.ok) {
        throw new ApiError(await detallError(res), res.status);
      }
      return (await res.json()) as EspaiDto;
    },
  };
}
