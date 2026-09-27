import { reactive, ref, type Ref } from "vue";

import { diesPerDefecte, validaDies, type DiaHorari } from "../disponibilitat";

export type CampsFormulariEspai = {
  name: string;
  capacity: string;
  equipment: string;
};

export type CampsEdicioEspai = CampsFormulariEspai & {
  active: boolean;
};

export type ErrorsFormulariEspai = {
  name: string;
  capacity: string;
  windows: string;
};

type FormulariEspai = {
  dies: Ref<DiaHorari[]>;
  errorsCamp: ErrorsFormulariEspai;
  valida: () => boolean;
};

export function useFormulariEspai(ambActiu: true): FormulariEspai & { camps: CampsEdicioEspai };
export function useFormulariEspai(ambActiu?: false): FormulariEspai & { camps: CampsFormulariEspai };
export function useFormulariEspai(ambActiu = false) {
  const camps = reactive<CampsFormulariEspai & { active?: boolean }>({
    name: "",
    capacity: "20",
    equipment: "",
  });
  if (ambActiu) {
    camps.active = true;
  }
  const dies = ref(diesPerDefecte());
  const errorsCamp = reactive<ErrorsFormulariEspai>({
    name: "",
    capacity: "",
    windows: "",
  });

  function valida(): boolean {
    errorsCamp.name = camps.name.trim() ? "" : "El nom de l’espai és obligatori.";
    const n = Number(camps.capacity);
    errorsCamp.capacity =
      Number.isInteger(n) && n >= 1 ? "" : "L’aforament ha de ser un enter positiu.";
    errorsCamp.windows = validaDies(dies.value);
    return !errorsCamp.name && !errorsCamp.capacity && !errorsCamp.windows;
  }

  return { camps, dies, errorsCamp, valida };
}
