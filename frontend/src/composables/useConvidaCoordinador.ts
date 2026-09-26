import { computed, reactive, ref } from "vue";

import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export function useConvidaCoordinador() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();

  const camps = reactive({ email: "" });
  const errorsCamp = reactive({ email: "" });
  const errorGlobal = ref("");
  const enviant = ref(false);
  const acceptUrl = ref("");
  const copiat = ref(false);

  const enllacComplet = computed(() => {
    if (!acceptUrl.value) {
      return "";
    }
    return `${window.location.origin}${acceptUrl.value}`;
  });

  function valida(): boolean {
    errorsCamp.email = camps.email.trim() ? "" : "L’email és obligatori.";
    return !errorsCamp.email;
  }

  async function enviar() {
    errorGlobal.value = "";
    copiat.value = false;
    acceptUrl.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.convidarCoordinador(sessio.token, camps.email);
      acceptUrl.value = dto.accept_url;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        errorGlobal.value = "Només el responsable pot convidar coordinadors.";
      } else if (err instanceof ApiError && err.status === 409) {
        errorGlobal.value = "Aquest email ja està registrat.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut crear la invitació.";
      }
    } finally {
      enviant.value = false;
    }
  }

  async function copiarEnllac() {
    if (!enllacComplet.value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(enllacComplet.value);
      copiat.value = true;
    } catch {
      copiat.value = false;
    }
  }

  return { camps, errorsCamp, errorGlobal, enviant, acceptUrl, enllacComplet, copiat, enviar, copiarEnllac };
}
