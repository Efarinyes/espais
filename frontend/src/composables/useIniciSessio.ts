import { inject, onScopeDispose, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { destiDespresSessio } from "../navegacio";
import { ConnexioVerificacioError, canalVerificacioKey } from "../services/canalVerificacio";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const MISSATGE_CONNEXIO = "No s’ha pogut obrir la connexió de verificació. Torna-ho a provar.";
const MISSATGE_TALL = "S’ha tallat la connexió. Torna a iniciar el procés.";

export function useIniciSessio() {
  const api = requireIdentityApi();
  const injectat = inject(canalVerificacioKey);
  if (!injectat) {
    throw new Error("cal CanalVerificacio");
  }
  const canal = injectat;
  const sessio = useSessioStore();
  const router = useRouter();

  const camps = reactive({
    email: "",
    password: "",
    codi: "",
  });
  const errorsCamp = reactive({
    email: "",
    password: "",
    codi: "",
  });
  const errorGlobal = ref("");
  const calVerificar = ref(false);
  const calTornar = ref(false);
  const enviant = ref(false);
  const pas = ref<"credencials" | "verificacio">("credencials");
  const codiRebut = ref("");
  const horaCaducitat = ref("");
  const repteId = ref("");
  const canalId = ref("");
  let ignoraDesconnexio = false;
  let caducitat: ReturnType<typeof setTimeout> | undefined;

  const deixa = canal.enDesconnexio(() => {
    if (ignoraDesconnexio || pas.value !== "verificacio") {
      return;
    }
    errorGlobal.value = MISSATGE_TALL;
    pas.value = "credencials";
    codiRebut.value = "";
    horaCaducitat.value = "";
  });

  function horaDe(iso: string): string {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) {
      return "";
    }
    return data.toLocaleTimeString("ca", { hour: "2-digit", minute: "2-digit" });
  }

  function programaCaducitat(iso: string) {
    if (caducitat) {
      clearTimeout(caducitat);
    }
    const ms = new Date(iso).getTime() - Date.now();
    caducitat = setTimeout(() => {
      if (pas.value === "verificacio") {
        errorGlobal.value = "El codi ha caducat. Torna a iniciar el procés.";
        calTornar.value = true;
      }
    }, Math.max(0, ms));
  }

  function validaCredencials(): boolean {
    errorsCamp.email = camps.email.trim() ? "" : "L’email és obligatori.";
    errorsCamp.password = camps.password ? "" : "La contrasenya és obligatòria.";
    return !errorsCamp.email && !errorsCamp.password;
  }

  function errorCredencials(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      errorGlobal.value = "Email o contrasenya incorrectes.";
      return;
    }
    if (err instanceof ApiError && err.status === 403) {
      errorGlobal.value = err.message;
      calVerificar.value = true;
      return;
    }
    if (err instanceof ConnexioVerificacioError) {
      errorGlobal.value = MISSATGE_CONNEXIO;
      return;
    }
    if (err instanceof ApiError) {
      errorGlobal.value = err.message;
      return;
    }
    errorGlobal.value = "No s’ha pogut iniciar la sessió.";
  }

  async function enviar() {
    errorGlobal.value = "";
    calVerificar.value = false;
    calTornar.value = false;
    if (!validaCredencials()) {
      return;
    }
    enviant.value = true;
    try {
      const channel = await canal.assegurar();
      const repte = await api.demanarCodiDeSessio(camps.email, camps.password, channel);
      canalId.value = channel;
      repteId.value = repte.challenge_id;
      pas.value = "verificacio";
      codiRebut.value = "";
      camps.codi = "";
      errorsCamp.codi = "";
      horaCaducitat.value = horaDe(repte.expires_at);
      programaCaducitat(repte.expires_at);
      const rebut = await canal.esperarCodi(repte.challenge_id);
      if (pas.value !== "verificacio") {
        return;
      }
      codiRebut.value = rebut.code;
      if (rebut.expires_at) {
        horaCaducitat.value = horaDe(rebut.expires_at);
        programaCaducitat(rebut.expires_at);
      }
    } catch (err) {
      if (err instanceof ConnexioVerificacioError) {
        if (pas.value !== "verificacio" && !errorGlobal.value) {
          errorGlobal.value = MISSATGE_CONNEXIO;
        } else if (pas.value === "verificacio") {
          errorGlobal.value = MISSATGE_TALL;
          pas.value = "credencials";
        }
        return;
      }
      errorCredencials(err);
      if (pas.value === "verificacio") {
        pas.value = "credencials";
      }
    } finally {
      enviant.value = false;
    }
  }

  async function verificar() {
    errorGlobal.value = "";
    errorsCamp.codi = "";
    if (calTornar.value) {
      return;
    }
    const codi = camps.codi.trim();
    if (!codi) {
      errorsCamp.codi = "El codi és obligatori.";
      return;
    }
    enviant.value = true;
    try {
      const dto = await api.confirmarCodiDeSessio(repteId.value, codi, canalId.value);
      ignoraDesconnexio = true;
      canal.tancar();
      sessio.iniciar(dto);
      await router.push(destiDespresSessio(dto.role));
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        errorsCamp.codi = err.message;
      } else if (err instanceof ApiError && (err.status === 410 || err.status === 401)) {
        errorGlobal.value = err.message;
        calTornar.value = true;
      } else if (err instanceof ApiError) {
        errorGlobal.value = err.message;
      } else {
        errorGlobal.value = "No s’ha pogut iniciar la sessió.";
      }
    } finally {
      enviant.value = false;
    }
  }

  function tornar() {
    ignoraDesconnexio = true;
    canal.tancar();
    ignoraDesconnexio = false;
    pas.value = "credencials";
    codiRebut.value = "";
    horaCaducitat.value = "";
    camps.codi = "";
    errorsCamp.codi = "";
    errorGlobal.value = "";
    calTornar.value = false;
    calVerificar.value = false;
    if (caducitat) {
      clearTimeout(caducitat);
    }
  }

  onScopeDispose(() => {
    deixa();
    if (caducitat) {
      clearTimeout(caducitat);
    }
    ignoraDesconnexio = true;
    canal.tancar();
  });

  return {
    camps,
    errorsCamp,
    errorGlobal,
    calVerificar,
    calTornar,
    enviant,
    pas,
    codiRebut,
    horaCaducitat,
    enviar,
    verificar,
    tornar,
  };
}
