import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { PALETA_PER_DEFECTE, paletaDe, type PaletaId } from "../aparenca";
import type { SessioDto } from "../services/identitat";

const STORAGE_KEY = "espais.sessio";

type SessioDesada = {
  token: string;
  entityId: string;
  entityName: string;
  userName: string;
  role: string;
  typology: string | null;
  palette: PaletaId;
};

function llegirDesada(): SessioDesada | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessioDesada;
    return { ...parsed, palette: paletaDe(parsed.palette) };
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
  const palette = ref<PaletaId>(desada?.palette ?? PALETA_PER_DEFECTE);

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
      palette: palette.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function aplicarVista(view: Omit<SessioDto, "token">) {
    entityId.value = view.entity_id;
    entityName.value = view.entity_name;
    userName.value = view.user_name;
    role.value = view.role;
    typology.value = view.typology;
    palette.value = paletaDe(view.palette);
    persistir();
  }

  function iniciar(dto: SessioDto) {
    token.value = dto.token;
    aplicarVista(dto);
  }

  function setPalette(valor: string) {
    palette.value = paletaDe(valor);
    persistir();
  }

  function sortir() {
    token.value = "";
    entityId.value = "";
    entityName.value = "";
    userName.value = "";
    role.value = "";
    typology.value = null;
    palette.value = PALETA_PER_DEFECTE;
    persistir();
  }

  return {
    token,
    entityId,
    entityName,
    userName,
    role,
    typology,
    palette,
    iniciada,
    iniciar,
    aplicarVista,
    setPalette,
    sortir,
  };
});
