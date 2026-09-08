import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { SessioDto } from "../services/identitat";

const STORAGE_KEY = "espais.sessio";

type SessioDesada = {
  token: string;
  entityId: string;
  entityName: string;
  userName: string;
  role: string;
  typology: string | null;
};

function llegirDesada(): SessioDesada | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessioDesada;
  } catch {
    return null;
  }
}

export const useSessioStore = defineStore("sessio", () => {
  const desada = llegirDesada();
  const token = ref(desada?.token ?? "");
  const entityId = ref(desada?.entityId ?? "");
  const entityName = ref(desada?.entityName ?? "");
  const userName = ref(desada?.userName ?? "");
  const role = ref(desada?.role ?? "");
  const typology = ref<string | null>(desada?.typology ?? null);

  const iniciada = computed(() => token.value.length > 0 && entityId.value.length > 0);

  function persistir() {
    if (!iniciada.value) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: SessioDesada = {
      token: token.value,
      entityId: entityId.value,
      entityName: entityName.value,
      userName: userName.value,
      role: role.value,
      typology: typology.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function iniciar(dto: SessioDto) {
    token.value = dto.token;
    entityId.value = dto.entity_id;
    entityName.value = dto.entity_name;
    userName.value = dto.user_name;
    role.value = dto.role;
    typology.value = dto.typology;
    persistir();
  }

  function sortir() {
    token.value = "";
    entityId.value = "";
    entityName.value = "";
    userName.value = "";
    role.value = "";
    typology.value = null;
    persistir();
  }

  return {
    token,
    entityId,
    entityName,
    userName,
    role,
    typology,
    iniciada,
    iniciar,
    sortir,
  };
});
