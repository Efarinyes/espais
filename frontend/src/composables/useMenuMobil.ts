import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { useRoute } from "vue-router";

/**
 * Obre i tanca el panell de navegació de pantalles petites.
 * El panell és fix: no entra al flux i no mou el contingut.
 */
export function useMenuMobil(
  contingut: Ref<HTMLElement | null>,
  boto: Ref<HTMLButtonElement | null>,
  panell: Ref<HTMLElement | null>,
) {
  const route = useRoute();
  const obert = ref(false);

  function enfocables(): HTMLElement[] {
    const arrel = panell.value;
    if (!arrel) {
      return [];
    }
    return [...arrel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
  }

  function obrir() {
    obert.value = true;
    void nextTick(() => {
      panell.value?.querySelector<HTMLElement>("[data-tanca-menu]")?.focus();
    });
  }

  function tancar(destinacio: "boto" | "contingut" = "boto") {
    if (!obert.value) {
      return;
    }
    obert.value = false;
    void nextTick(() => {
      if (destinacio === "contingut") {
        contingut.value?.focus();
        return;
      }
      boto.value?.focus();
    });
  }

  function alternar() {
    if (obert.value) {
      tancar();
      return;
    }
    obrir();
  }

  function onTecla(event: KeyboardEvent) {
    if (!obert.value) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      tancar();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const elements = enfocables();
    const primer = elements[0];
    const darrer = elements[elements.length - 1];
    if (!primer || !darrer) {
      return;
    }
    const actiu = document.activeElement;
    if (event.shiftKey && actiu === primer) {
      event.preventDefault();
      darrer.focus();
    } else if (!event.shiftKey && actiu === darrer) {
      event.preventDefault();
      primer.focus();
    }
  }

  watch(
    () => route.fullPath,
    () => {
      tancar("contingut");
    },
  );

  onMounted(() => window.addEventListener("keydown", onTecla));
  onUnmounted(() => window.removeEventListener("keydown", onTecla));

  return { obert, alternar, tancar };
}
