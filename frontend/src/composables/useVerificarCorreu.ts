import { reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { decodificaToken, fragmentCru, treuFragment } from "../enllacFragment";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export type PasVerificacio = "demanar" | "confirmar" | "fet";

export function useVerificarCorreu() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const route = useRoute();
  const router = useRouter();
  let token = "";

  const camps = reactive({ email: "" });
  const errorsCamp = reactive({ email: "" });
  const pas = ref<PasVerificacio>("demanar");
  const missatge = ref("");
  const errorGlobal = ref("");
  const enllacInvalid = ref(false);
  const enviant = ref(false);

  function prenTokenDelFragment(hash: string) {
    const cru = fragmentCru(hash);
    if (!cru) {
      return;
    }
    treuFragment(router, route);
    const nou = decodificaToken(cru);
    if (!nou) {
      return;
    }
    token = nou;
    missatge.value = "";
    errorGlobal.value = "";
    enllacInvalid.value = false;
    pas.value = "confirmar";
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

  async function demanar() {
    errorGlobal.value = "";
    missatge.value = "";
    if (!validaEmail()) {
      return;
    }
    enviant.value = true;
    try {
      const resposta = await api.demanarVerificacio(camps.email.trim());
      missatge.value = resposta.detall;
    } catch {
      errorGlobal.value = "No s’ha pogut enviar la sol·licitud.";
    } finally {
      enviant.value = false;
    }
  }

  async function confirmar() {
    errorGlobal.value = "";
    enviant.value = true;
    try {
      const resposta = await api.confirmarVerificacio(token);
      token = "";
      sessio.sortir();
      missatge.value = resposta.detall;
      pas.value = "fet";
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        token = "";
        enllacInvalid.value = true;
        errorGlobal.value = err.message;
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut verificar el correu.";
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
