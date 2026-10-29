import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { destiDespresSessio } from "../navegacio";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

function tokenDelFragment(): string {
  const cru = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const token = decodeURIComponent(cru).trim();
  if (window.location.hash) {
    const net = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(window.history.state, "", net);
  }
  return token;
}

export function useRecuperarAcces() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const router = useRouter();
  const token = tokenDelFragment();

  const camps = reactive({
    email: "",
    password: "",
  });
  const errorsCamp = reactive({
    email: "",
    password: "",
  });
  const missatge = ref("");
  const errorGlobal = ref("");
  const enviant = ref(false);
  const calContrasenya = ref(Boolean(token));

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
      const dto = await api.confirmarRecuperacio(token, camps.password);
      sessio.iniciar(dto);
      await router.push(destiDespresSessio(dto.role));
    } catch (err) {
      if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut desar la contrasenya.";
      }
    } finally {
      enviant.value = false;
    }
  }

  return {
    camps,
    errorsCamp,
    missatge,
    errorGlobal,
    enviant,
    calContrasenya,
    demanar,
    confirmar,
  };
}
