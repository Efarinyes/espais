import { onMounted, ref } from "vue";

type PromptInstalacio = Event & {
  prompt: () => Promise<void>;
};

export function useInstalacio() {
  const potInstalar = ref(false);
  const esIos = ref(false);
  let espera: PromptInstalacio | null = null;

  onMounted(() => {
    const navigatorAmbIos = navigator as Navigator & { standalone?: boolean };
    const jaInstalada =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      navigatorAmbIos.standalone === true;
    if (jaInstalada) {
      return;
    }
    esIos.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      espera = event as PromptInstalacio;
      potInstalar.value = true;
    });
  });

  async function instalar() {
    if (!espera) {
      return;
    }
    await espera.prompt();
    potInstalar.value = false;
    espera = null;
  }

  return { potInstalar, esIos, instalar };
}
