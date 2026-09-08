import { inject, type InjectionKey } from "vue";

export type RolSessio = "responsible" | "coordinator";

export type SessioDto = {
  token: string;
  entity_id: string;
  user_id: string;
  membership_id?: string;
  role: RolSessio;
  entity_name: string;
  user_name: string;
  typology: string | null;
};

export type RegistreInput = {
  entity_name: string;
  typology: string;
  responsible_name: string;
  email: string;
  password: string;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type IdentityApi = {
  registrar(input: RegistreInput): Promise<SessioDto>;
  iniciarSessio(email: string, password: string): Promise<SessioDto>;
  obtenirSessio(token: string): Promise<Omit<SessioDto, "token">>;
};

export const identityApiKey: InjectionKey<IdentityApi> = Symbol("identityApi");

export function requireIdentityApi(): IdentityApi {
  const api = inject(identityApiKey);
  if (!api) {
    throw new Error("cal IdentityApi");
  }
  return api;
}

async function llegirError(res: Response): Promise<string> {
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
    /* cos no JSON */
  }
  return "S’ha produït un error.";
}

export function createIdentityApi(baseUrl = ""): IdentityApi {
  async function parseSessio(res: Response): Promise<SessioDto> {
    if (!res.ok) {
      throw new ApiError(await llegirError(res), res.status);
    }
    return (await res.json()) as SessioDto;
  }

  return {
    async registrar(input) {
      const res = await fetch(`${baseUrl}/registre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: input.entity_name,
          typology: input.typology || null,
          responsible_name: input.responsible_name,
          email: input.email,
          password: input.password,
        }),
      });
      return parseSessio(res);
    },

    async iniciarSessio(email, password) {
      const res = await fetch(`${baseUrl}/sessio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return parseSessio(res);
    },

    async obtenirSessio(token) {
      const res = await fetch(`${baseUrl}/sessio`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new ApiError(await llegirError(res), res.status);
      }
      return (await res.json()) as Omit<SessioDto, "token">;
    },
  };
}
