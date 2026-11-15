import { ref } from "vue";

export const CLAU_AVIS_COOKIES = "espais.avis-cookies";
const VALOR_TANCAT = "tancat";

export function avisCookiesTancat(valor: string | null): boolean {
  return valor === VALOR_TANCAT;
}

export function useAvisCookies() {
  const visible = ref(true);
  if (typeof localStorage !== "undefined") {
    visible.value = !avisCookiesTancat(localStorage.getItem(CLAU_AVIS_COOKIES));
  }

  function tancar() {
    localStorage.setItem(CLAU_AVIS_COOKIES, VALOR_TANCAT);
    visible.value = false;
  }

  return { visible, tancar };
}
