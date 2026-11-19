import { inject, ref } from "vue";

import {
  createNavegadorPush,
  navegadorPushKey,
  pushApiKey,
  type NavegadorPush,
  type PushApi,
} from "../services/push";
import { useSessioStore } from "../stores/sessio";

/**
 * - `carregant`: encara no se sap.
 * - `desactivat-servidor`: el servidor no té Web Push configurat (no es mostra res).
 * - `no-suportat` / `cal-instalar`: el navegador no pot rebre push.
 * - `bloquejat`: l’usuari ha denegat el permís al navegador.
 * - `inactiu` / `actiu`: permís disponible; amb o sense subscripció en aquest dispositiu.
 */
export type EstatPush =
  | "carregant"
  | "desactivat-servidor"
  | "no-suportat"
  | "cal-instalar"
  | "bloquejat"
  | "inactiu"
  | "actiu";

/** Si l’usuari ha triat desactivar-les, no les tornem a activar soles en iniciar sessió. */
export const CLAU_PUSH_DESACTIVAT = "espais.push.desactivat";

function injeccio() {
  const api = inject(pushApiKey, null);
  const navegador = inject<NavegadorPush | null>(navegadorPushKey, null) ?? createNavegadorPush();
  return { api, navegador };
}

export function usePush(deps: { api?: PushApi | null; navegador?: NavegadorPush } = {}) {
  const injectat = injeccio();
  const api = deps.api === undefined ? injectat.api : deps.api;
  const navegador = deps.navegador ?? injectat.navegador;
  const sessio = useSessioStore();
  const estat = ref<EstatPush>("carregant");
  const ocupat = ref(false);
  const error = ref("");
  let clauPublica: string | null = null;

  async function carregarConfiguracio(): Promise<boolean> {
    if (!api || !sessio.token) {
      estat.value = "desactivat-servidor";
      return false;
    }
    try {
      const config = await api.configuracio(sessio.token);
      if (!config.enabled || !config.public_key) {
        estat.value = "desactivat-servidor";
        return false;
      }
      clauPublica = config.public_key;
      return true;
    } catch {
      estat.value = "desactivat-servidor";
      return false;
    }
  }

  /** Ordena el que veu l’usuari i sincronitza la subscripció del navegador amb el compte actual. */
  async function inicialitzar() {
    estat.value = "carregant";
    error.value = "";
    // Primer el servidor: si no té push configurat, la funció no existeix per a ningú.
    if (!(await carregarConfiguracio())) {
      return;
    }
    const suport = navegador.suport();
    if (suport !== "suportat") {
      estat.value = suport;
      return;
    }
    try {
      const permis = navegador.permis();
      if (permis === "denied") {
        estat.value = "bloquejat";
        return;
      }
      if (permis !== "granted") {
        estat.value = "inactiu";
        return;
      }
      let subscripcio = await navegador.subscripcioActual();
      if (!subscripcio && localStorage.getItem(CLAU_PUSH_DESACTIVAT) !== "1") {
        subscripcio = await navegador.subscriure(clauPublica as string);
      }
      if (!subscripcio) {
        estat.value = "inactiu";
        return;
      }
      // Idempotent: reassigna el navegador al compte actual i recrea la subscripció esborrada.
      await api!.registrar(sessio.token, subscripcio);
      estat.value = "actiu";
    } catch {
      estat.value = "inactiu";
    }
  }

  async function activar() {
    if (ocupat.value || !clauPublica) {
      return;
    }
    ocupat.value = true;
    error.value = "";
    try {
      // El permís es demana primer: el navegador el vincula al gest de l’usuari.
      const permis = navegador.permis() === "default" ? await navegador.demanarPermis() : navegador.permis();
      if (permis === "denied") {
        estat.value = "bloquejat";
        return;
      }
      if (permis !== "granted") {
        estat.value = "inactiu";
        return;
      }
      const subscripcio = await navegador.subscriure(clauPublica);
      await api!.registrar(sessio.token, subscripcio);
      localStorage.removeItem(CLAU_PUSH_DESACTIVAT);
      estat.value = "actiu";
    } catch {
      error.value = "No s’han pogut activar les notificacions d’aquest dispositiu. Els avisos continuen sortint aquí.";
    } finally {
      ocupat.value = false;
    }
  }

  async function desactivar() {
    if (ocupat.value) {
      return;
    }
    ocupat.value = true;
    error.value = "";
    try {
      localStorage.setItem(CLAU_PUSH_DESACTIVAT, "1");
      const endpoint = await navegador.cancelar();
      if (endpoint && api) {
        await api.cancelar(sessio.token, endpoint);
      }
      estat.value = "inactiu";
    } catch {
      error.value = "No s’han pogut desactivar les notificacions d’aquest dispositiu.";
    } finally {
      ocupat.value = false;
    }
  }

  return { estat, ocupat, error, inicialitzar, activar, desactivar };
}

/**
 * En sortir de la sessió el dispositiu deixa de rebre els avisos d’aquest compte.
 * Mai impedeix sortir: qualsevol error s’ignora i el servidor ja esborra les caducades.
 */
export async function cancelaPushAlSortir(
  token: string,
  api: PushApi | null,
  navegador: NavegadorPush | null,
): Promise<void> {
  if (!api || !navegador) {
    return;
  }
  try {
    if (navegador.suport() !== "suportat" || navegador.permis() !== "granted") {
      return;
    }
    const endpoint = await navegador.cancelar();
    if (endpoint) {
      await api.cancelar(token, endpoint);
    }
  } catch {
    /* sortir no depèn del push */
  }
}

/** Torna a deixar el dispositiu preparat en entrar al tauler (només coordinadors). */
export function useSincronitzaPush() {
  const sessio = useSessioStore();
  const { inicialitzar } = usePush();

  async function sincronitzar() {
    if (sessio.role !== "coordinator" || !sessio.iniciada) {
      return;
    }
    await inicialitzar();
  }

  return { sincronitzar };
}
