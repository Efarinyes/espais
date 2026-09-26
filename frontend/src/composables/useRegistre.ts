import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { destiDespresSessio } from "../navegacio";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export function useRegistre() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const router = useRouter();

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
    errorGlobal.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.registrar({
        entity_name: camps.entity_name,
        typology: camps.typology,
        responsible_name: camps.responsible_name,
        email: camps.email,
        password: camps.password,
      });
      sessio.iniciar(dto);
      await router.push(destiDespresSessio(dto.role));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        errorGlobal.value = "Aquest email ja està registrat. Inicia sessió o recupera l’accés.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut completar el registre.";
      }
    } finally {
      enviant.value = false;
    }
  }

  return { camps, errorsCamp, errorGlobal, enviant, enviar };
}
