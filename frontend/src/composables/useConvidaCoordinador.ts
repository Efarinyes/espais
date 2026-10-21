import { computed, reactive, ref } from "vue";

import { ApiError } from "../services/http";
import { requireIdentityApi, type LliuramentInvitacio } from "../services/identitat";
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
  const delivery = ref<LliuramentInvitacio | "">("");

  const avis = computed(() => {
    if (delivery.value === "sent") {
      return "Hem enviat l’enllaç per correu. Caduca al cap de 14 dies.";
    }
    if (delivery.value === "unavailable") {
      return "Encara no enviem correu. Copia l’enllaç i envia’l tu. Caduca al cap de 14 dies.";
    }
    if (delivery.value === "failed") {
      return "No s’ha pogut enviar el correu. La invitació és vàlida: copia l’enllaç i envia’l tu. Caduca al cap de 14 dies.";
    }
    return "";
  });

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
    delivery.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.convidarCoordinador(sessio.token, camps.email);
      delivery.value = dto.delivery;
      acceptUrl.value = dto.delivery === "sent" ? "" : dto.accept_url;
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

  return {
    camps,
    errorsCamp,
    errorGlobal,
    enviant,
    acceptUrl,
    enllacComplet,
    copiat,
    avis,
    enviar,
    copiarEnllac,
  };
}
