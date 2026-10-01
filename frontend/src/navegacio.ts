import type { RouteLocationRaw } from "vue-router";

export function destiDespresSessio(role: string): RouteLocationRaw {
  if (role === "responsible" || role === "coordinator") {
    return { name: "espais" };
  }
  return { name: "inici" };
}
