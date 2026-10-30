import { reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export type PasRecuperacio = "demanar" | "contrasenya" | "fet";

function decodifica(cru: string): string {
  try {
    return decodeURIComponent(cru).trim();
  } catch {
    return "";
  }
}

export function useRecuperarAcces() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const route = useRoute();
  const router = useRouter();
  let token = "";

  const camps = reactive({
    email: "",
    password: "",
  });
  const errorsCamp = reactive({
    email: "",
    password: "",
  });
  const pas = ref<PasRecuperacio>("demanar");
  const missatge = ref("");
  const errorGlobal = ref("");
  const enllacInvalid = ref(false);
  const enviant = ref(false);

  function prenTokenDelFragment(hash: string) {
    const cru = hash.startsWith("#") ? hash.slice(1) : "";
    if (!cru) {
      return;
    }
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    void router.replace({ path: route.path, query: route.query, hash: "" });
    const nou = decodifica(cru);
    if (!nou) {
      return;
    }
    token = nou;
    camps.password = "";
    errorsCamp.password = "";
    missatge.value = "";
    errorGlobal.value = "";
    enllacInvalid.value = false;
    pas.value = "contrasenya";
  }

  prenTokenDelFragment(window.location.hash || route.hash);
  watch(
    () => route.hash,
    (hash) => prenTokenDelFragment(hash),
  );

  function validaEmail(): boolean {
    errorsCamp.email = camps.email.trim() ? "" : "L’email és obligatori.";
    return !errorsCamp.email;
  }

  function validaContrasenya(): boolean {
    errorsCamp.password =
      camps.password.length >= 8 ? "" : "La contrasenya ha de tenir com a mínim 8 caràcters.";
    return !errorsCamp.password;
  }

  async function demanar() {
    errorGlobal.value = "";
    missatge.value = "";
    if (!validaEmail()) {
      return;
    }
    enviant.value = true;
    try {
      const resposta = await api.demanarRecuperacio(camps.email.trim());
      missatge.value = resposta.detall;
    } catch {
      errorGlobal.value = "No s’ha pogut enviar la sol·licitud.";
    } finally {
      enviant.value = false;
    }
  }

  async function confirmar() {
    errorGlobal.value = "";
    if (!validaContrasenya()) {
      return;
    }
    enviant.value = true;
    try {
      const resposta = await api.confirmarRecuperacio(token, camps.password);
      token = "";
      camps.password = "";
      sessio.sortir();
      missatge.value = resposta.detall;
      pas.value = "fet";
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        token = "";
        camps.password = "";
        enllacInvalid.value = true;
        errorGlobal.value = err.message;
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut desar la contrasenya.";
      }
    } finally {
      enviant.value = false;
    }
  }

  function demanarEnllacNou() {
    errorGlobal.value = "";
    missatge.value = "";
    enllacInvalid.value = false;
    pas.value = "demanar";
  }

  return {
    camps,
    errorsCamp,
    pas,
    missatge,
    errorGlobal,
    enllacInvalid,
    enviant,
    demanar,
    confirmar,
    demanarEnllacNou,
  };
}
