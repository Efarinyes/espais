import { onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";

import { PALETA_PER_DEFECTE } from "../aparenca";
import { decisioAcces, esPrivada } from "../autoritzacio";
import { refrescarSessio } from "../confirmacioSessio";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";

export function useSincronitzaSessio() {
  const sessio = useSessioStore();
  const aparenca = useAparencaStore();
  const router = useRouter();

  async function enReprendre() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const rolAbans = sessio.role;
    const confirmadaAbans = sessio.confirmada;
    const resultat = await refrescarSessio();
    await router.isReady();
    const actual = router.currentRoute.value.name;
    if (resultat === "tancada") {
      const desti = decisioAcces(actual, {
        iniciada: sessio.iniciada,
        confirmada: sessio.confirmada,
        role: sessio.role,
      });
      if (desti !== true && desti.name !== actual) {
        await router.replace(desti);
      }
      return;
    }
    if (resultat === "error" && !sessio.confirmada && esPrivada(actual) && actual !== "inici") {
      await router.replace({ name: "inici" });
      return;
    }
    if (resultat === "ok" && (!confirmadaAbans || sessio.role !== rolAbans)) {
      const desti = decisioAcces(actual, {
        iniciada: sessio.iniciada,
        confirmada: sessio.confirmada,
        role: sessio.role,
      });
      if (desti !== true && desti.name !== actual) {
        await router.replace(desti);
      }
    }
  }

  watch(
    () => [sessio.iniciada, sessio.palette] as const,
    ([iniciada, palette]) => {
      aparenca.setPaletaEntitat(iniciada ? palette : PALETA_PER_DEFECTE);
    },
    { immediate: true },
  );

  onMounted(() => {
    void enReprendre();
    window.addEventListener("focus", enReprendre);
    document.addEventListener("visibilitychange", enReprendre);
  });

  onUnmounted(() => {
    window.removeEventListener("focus", enReprendre);
    document.removeEventListener("visibilitychange", enReprendre);
  });
}
