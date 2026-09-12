import { onMounted, onUnmounted, ref } from "vue";

export const HERO_FONS = [
  { clau: "cercle", src: "/landing/hero.jpg", width: 1920, height: 2558 },
  { clau: "civic", src: "/landing/opcions/centre-civic.jpg", width: 1920, height: 1280 },
  { clau: "files", src: "/landing/opcions/files-cadires.jpg", width: 1920, height: 1280 },
  { clau: "gran", src: "/landing/opcions/sala-gran.jpg", width: 1920, height: 1440 },
] as const;

export const INTERVAL_HERO_MS = 7000;

export function useHeroFons() {
  const index = ref(0);
  const pausat = ref(false);
  const reduccio =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function seguent() {
    index.value = (index.value + 1) % HERO_FONS.length;
  }

  function togglePausa() {
    pausat.value = !pausat.value;
  }

  let intervalId = 0;

  onMounted(() => {
    if (reduccio) {
      return;
    }
    intervalId = window.setInterval(() => {
      if (!pausat.value && document.visibilityState !== "hidden") {
        seguent();
      }
    }, INTERVAL_HERO_MS);
  });

  onUnmounted(() => {
    window.clearInterval(intervalId);
  });

  return {
    heros: HERO_FONS,
    index,
    pausat,
    reduccio,
    togglePausa,
  };
}
