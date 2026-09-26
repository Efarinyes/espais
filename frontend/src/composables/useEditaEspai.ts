import { reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { diesAFinestres, diesPerDefecte, finestresADies, validaDies } from "../disponibilitat";
import { ApiError } from "../services/http";
import { requireEspaisApi } from "../services/espais";
import { useSessioStore } from "../stores/sessio";

export function useEditaEspai() {
  const api = requireEspaisApi();
  const sessio = useSessioStore();
  const route = useRoute();
  const router = useRouter();

  const camps = reactive({
    name: "",
    capacity: "20",
    equipment: "",
    active: true,
  });
  const dies = ref(diesPerDefecte());
  const errorsCamp = reactive({
    name: "",
    capacity: "",
    windows: "",
  });
  const errorGlobal = ref("");
  const carregant = ref(false);
  const enviant = ref(false);
  const trobat = ref(false);

  function valida(): boolean {
    errorsCamp.name = camps.name.trim() ? "" : "El nom de l’espai és obligatori.";
    const n = Number(camps.capacity);
    errorsCamp.capacity =
      Number.isInteger(n) && n >= 1 ? "" : "L’aforament ha de ser un enter positiu.";
    errorsCamp.windows = validaDies(dies.value);
    return !errorsCamp.name && !errorsCamp.capacity && !errorsCamp.windows;
  }

  function aplicarDies(windows: { weekday: number; start: string; end: string }[]) {
    dies.value = finestresADies(windows);
  }

  async function carregar() {
    const id = String(route.params.id ?? "");
    if (!sessio.token || !id) {
      return;
    }
    carregant.value = true;
    errorGlobal.value = "";
    trobat.value = false;
    try {
      const espai = await api.obtenir(sessio.token, id);
      camps.name = espai.name;
      camps.capacity = String(espai.capacity);
      camps.equipment = espai.equipment ?? "";
      camps.active = espai.active;
      aplicarDies(espai.windows ?? []);
      trobat.value = true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        errorGlobal.value = "Aquest espai no existeix a l’entitat.";
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut carregar l’espai.";
      }
    } finally {
      carregant.value = false;
    }
  }

  async function enviar() {
    const id = String(route.params.id ?? "");
    errorGlobal.value = "";
    if (!valida() || !sessio.token || !id) {
      return;
    }
    enviant.value = true;
    try {
      await api.actualitzar(sessio.token, id, {
        name: camps.name,
        capacity: Number(camps.capacity),
        equipment: camps.equipment,
        active: camps.active,
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

  watch(
    () => route.params.id,
    () => {
      void carregar();
    },
    { immediate: true },
  );

  return { camps, dies, errorsCamp, errorGlobal, carregant, enviant, trobat, enviar };
}
