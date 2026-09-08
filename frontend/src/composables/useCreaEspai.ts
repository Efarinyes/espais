import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { diesAFinestres, diesPerDefecte, validaDies } from "../disponibilitat";
import { ApiError } from "../services/identitat";
import { requireEspaisApi } from "../services/espais";
import { useSessioStore } from "../stores/sessio";

export function useCreaEspai() {
  const api = requireEspaisApi();
  const sessio = useSessioStore();
  const router = useRouter();

  const camps = reactive({
    name: "",
    capacity: "20",
    equipment: "",
  });
  const dies = ref(diesPerDefecte());
  const errorsCamp = reactive({
    name: "",
    capacity: "",
    windows: "",
  });
  const errorGlobal = ref("");
  const enviant = ref(false);

  function valida(): boolean {
    errorsCamp.name = camps.name.trim() ? "" : "El nom de l’espai és obligatori.";
    const n = Number(camps.capacity);
    errorsCamp.capacity =
      Number.isInteger(n) && n >= 1 ? "" : "L’aforament ha de ser un enter positiu.";
    errorsCamp.windows = validaDies(dies.value);
    return !errorsCamp.name && !errorsCamp.capacity && !errorsCamp.windows;
  }

  async function enviar() {
    errorGlobal.value = "";
    if (!valida() || !sessio.token) {
      return;
    }
    enviant.value = true;
    try {
      await api.crear(sessio.token, {
        name: camps.name,
        capacity: Number(camps.capacity),
        equipment: camps.equipment,
        windows: diesAFinestres(dies.value),
      });
      await router.push({ name: "espais" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        errorGlobal.value = "Aquest nom d’espai ja existeix a l’entitat.";
      } else if (err instanceof ApiError && err.status === 403) {
        errorGlobal.value = "Només el responsable pot definir espais.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut desar l’espai.";
      }
    } finally {
      enviant.value = false;
    }
  }

  return { camps, dies, errorsCamp, errorGlobal, enviant, enviar };
}
