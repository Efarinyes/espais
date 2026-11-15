import { esRolConegut } from "./autoritzacio";
import { ApiError } from "./services/http";
import type { SessioDto } from "./services/identitat";
import { useSessioStore } from "./stores/sessio";

export type ResultatConfirmacio = "ok" | "tancada" | "error";

type VistaSessio = Omit<SessioDto, "token">;
type ObtenirSessio = (token: string) => Promise<VistaSessio>;

let obtenirSessio: ObtenirSessio | null = null;
let enCurs: Promise<ResultatConfirmacio> | null = null;

export function configuraConfirmacioSessio(fn: ObtenirSessio | null): void {
  obtenirSessio = fn;
}

export async function refrescarSessio(): Promise<ResultatConfirmacio> {
  if (enCurs) {
    return enCurs;
  }
  const peticio = executar();
  enCurs = peticio;
  try {
    return await peticio;
  } finally {
    if (enCurs === peticio) {
      enCurs = null;
    }
  }
}

async function executar(): Promise<ResultatConfirmacio> {
  const sessio = useSessioStore();
  if (!sessio.iniciada) {
    return "ok";
  }
  if (!obtenirSessio) {
    return sessio.confirmada ? "ok" : "error";
  }
  try {
    const vista = await obtenirSessio(sessio.token);
    if (!esRolConegut(vista.role)) {
      sessio.sortir();
      return "tancada";
    }
    sessio.aplicarVista(vista);
    return "ok";
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      sessio.sortir();
      return "tancada";
    }
    return "error";
  }
}
