import { inject, type InjectionKey } from "vue";

import { fetchApi } from "./http";

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
  palette?: string;
};

export type RegistreInput = {
  entity_name: string;
  typology: string;
  responsible_name: string;
  email: string;
  password: string;
};

export type InvitacioDto = {
  email: string;
  accept_url: string;
  expires_at: string;
};

export type InvitacioPreviewDto = {
  email: string;
  entity_name: string;
};

export type IdentityApi = {
  registrar(input: RegistreInput): Promise<SessioDto>;
  iniciarSessio(email: string, password: string): Promise<SessioDto>;
  obtenirSessio(token: string): Promise<Omit<SessioDto, "token">>;
  actualitzarPaleta(token: string, palette: string): Promise<{ palette: string }>;
  convidarCoordinador(token: string, email: string): Promise<InvitacioDto>;
  obtenirInvitacio(inviteToken: string): Promise<InvitacioPreviewDto>;
  acceptarInvitacio(inviteToken: string, name: string, password: string): Promise<SessioDto>;
};

export const identityApiKey: InjectionKey<IdentityApi> = Symbol("identityApi");

export function requireIdentityApi(): IdentityApi {
  const api = inject(identityApiKey);
  if (!api) {
    throw new Error("cal IdentityApi");
  }
  return api;
}

export function createIdentityApi(baseUrl = ""): IdentityApi {
  return {
    async registrar(input) {
      return fetchApi<SessioDto>(`${baseUrl}/registre`, {
        method: "POST",
        body: JSON.stringify({
          entity_name: input.entity_name,
          typology: input.typology || null,
          responsible_name: input.responsible_name,
          email: input.email,
          password: input.password,
        }),
      });
    },

    async iniciarSessio(email, password) {
      return fetchApi<SessioDto>(`${baseUrl}/sessio`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    async obtenirSessio(token) {
      return fetchApi<Omit<SessioDto, "token">>(`${baseUrl}/sessio`, { token });
    },

    async actualitzarPaleta(token, palette) {
      return fetchApi<{ palette: string }>(`${baseUrl}/entitat/paleta`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ palette }),
      });
    },

    async convidarCoordinador(token, email) {
      return fetchApi<InvitacioDto>(`${baseUrl}/invitacions`, {
        method: "POST",
        token,
        body: JSON.stringify({ email }),
      });
    },

    async obtenirInvitacio(inviteToken) {
      return fetchApi<InvitacioPreviewDto>(`${baseUrl}/invitacions/${inviteToken}`);
    },

    async acceptarInvitacio(inviteToken, name, password) {
      return fetchApi<SessioDto>(`${baseUrl}/invitacions/${inviteToken}/acceptar`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
    },
  };
}
