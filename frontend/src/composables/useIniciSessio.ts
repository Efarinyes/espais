import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { destiDespresSessio } from "../navegacio";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

export function useIniciSessio() {
  const api = requireIdentityApi();
  const sessio = useSessioStore();
  const router = useRouter();

  const camps = reactive({
    email: "",
    password: "",
  });
  const errorsCamp = reactive({
    email: "",
    password: "",
  });
  const errorGlobal = ref("");
  const enviant = ref(false);

  function valida(): boolean {
    errorsCamp.email = camps.email.trim() ? "" : "L’email és obligatori.";
    errorsCamp.password = camps.password ? "" : "La contrasenya és obligatòria.";
    return !errorsCamp.email && !errorsCamp.password;
  }

  async function enviar() {
    errorGlobal.value = "";
    if (!valida()) {
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.iniciarSessio(camps.email, camps.password);
      sessio.iniciar(dto);
      await router.push(destiDespresSessio(dto.role));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        errorGlobal.value = "Email o contrasenya incorrectes.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut iniciar la sessió.";
      }
    } finally {
      enviant.value = false;
    }
  }

  return { camps, errorsCamp, errorGlobal, enviant, enviar };
}
