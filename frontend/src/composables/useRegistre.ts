import { reactive, ref } from "vue";

import { ApiError } from "../services/http";
import { requireIdentityApi, type LliuramentVerificacio } from "../services/identitat";

export function useRegistre() {
  const api = requireIdentityApi();

  const camps = reactive({
    entity_name: "",
    typology: "",
    responsible_name: "",
    email: "",
    password: "",
  });
  const errorsCamp = reactive({
    entity_name: "",
    responsible_name: "",
    email: "",
    password: "",
  });
  const errorGlobal = ref("");
  const enviant = ref(false);
  const reenviant = ref(false);
  const pendent = ref(false);
  const missatge = ref("");
  const lliurament = ref<LliuramentVerificacio | "">("");

  function valida(): boolean {
    errorsCamp.entity_name = camps.entity_name.trim() ? "" : "El nom de l’entitat és obligatori.";
    errorsCamp.responsible_name = camps.responsible_name.trim()
      ? ""
      : "El nom del responsable és obligatori.";
    errorsCamp.email = camps.email.trim() ? "" : "L’email és obligatori.";
    errorsCamp.password =
      camps.password.length >= 8 ? "" : "La contrasenya ha de tenir com a mínim 8 caràcters.";
    return !errorsCamp.entity_name && !errorsCamp.responsible_name && !errorsCamp.email && !errorsCamp.password;
  }

  async function enviar() {
    if (enviant.value || pendent.value) {
      return;
    }
    errorGlobal.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const resultat = await api.registrar({
        entity_name: camps.entity_name,
        typology: camps.typology,
        responsible_name: camps.responsible_name,
        email: camps.email,
        password: camps.password,
      });
      missatge.value = resultat.detall;
      lliurament.value = resultat.lliurament;
      pendent.value = true;
    } catch (err) {
      if (pendent.value) {
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        errorGlobal.value = "No s’ha pogut completar el registre. Revisa les dades o inicia la sessió.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut completar el registre.";
      }
    } finally {
      enviant.value = false;
    }
  }

  async function reenviar() {
    errorGlobal.value = "";
    reenviant.value = true;
    try {
      const resultat = await api.demanarVerificacio(camps.email.trim());
      missatge.value = resultat.detall;
    } catch {
      errorGlobal.value = "No s’ha pogut enviar la sol·licitud.";
    } finally {
      reenviant.value = false;
    }
  }

  return {
    camps,
    errorsCamp,
    errorGlobal,
    enviant,
    reenviant,
    pendent,
    missatge,
    lliurament,
    enviar,
    reenviar,
  };
}
