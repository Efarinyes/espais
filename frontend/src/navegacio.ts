import type { RouteLocationRaw } from "vue-router";

import { esRolConegut } from "./autoritzacio";

export function destiDespresSessio(role: string): RouteLocationRaw {
  if (esRolConegut(role)) {
    return { name: "espais" };
  }
  return { name: "inici" };
}
