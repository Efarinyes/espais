import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ApiError } from "../services/http";
import { requireIdentityApi, type InvitacioPreviewDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export function useAcceptaInvitacio() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const route = useRoute();
  const router = useRouter();

  const preview = ref<InvitacioPreviewDto | null>(null);
  const carregant = ref(true);
  const errorCarrega = ref("");
  const camps = reactive({ name: "", password: "" });
  const errorsCamp = reactive({ name: "", password: "" });
  const errorGlobal = ref("");
  const enviant = ref(false);

  function tokenRuta(): string {
    const raw = route.params.token;
    return typeof raw === "string" ? raw : "";
  }

  async function carregar() {
    carregant.value = true;
    errorCarrega.value = "";
    try {
      preview.value = await api.obtenirInvitacio(tokenRuta());
    } catch (err) {
      preview.value = null;
      if (err instanceof ApiError && err.status === 410) {
        errorCarrega.value = "Aquesta invitació ha caducat o ja s’ha acceptat.";
      } else if (err instanceof ApiError && err.status === 404) {
        errorCarrega.value = "Aquesta invitació no existeix.";
      } else if (err instanceof ApiError) {
        errorCarrega.value = err.message;
      } else {
        errorCarrega.value = "No s’ha pogut carregar la invitació.";
      }
    } finally {
      carregant.value = false;
    }
  }

  function valida(): boolean {
    errorsCamp.name = camps.name.trim() ? "" : "El nom és obligatori.";
    errorsCamp.password =
      camps.password.length >= 8 ? "" : "La contrasenya ha de tenir com a mínim 8 caràcters.";
    return !errorsCamp.name && !errorsCamp.password;
  }

  async function enviar() {
    errorGlobal.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.acceptarInvitacio(tokenRuta(), camps.name, camps.password);
      sessio.iniciar(dto);
      await router.push({ name: "inici" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        errorGlobal.value = "Aquest email ja està registrat. Inicia sessió.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut acceptar la invitació.";
      }
    } finally {
      enviant.value = false;
    }
  }

  onMounted(() => {
    void carregar();
  });

  return { preview, carregant, errorCarrega, camps, errorsCamp, errorGlobal, enviant, enviar };
}
