import type { RouteLocationRaw } from "vue-router";

export function destiDespresSessio(role: string): RouteLocationRaw {
  if (role === "responsible") {
    return { name: "espais" };
  }
  return { name: "inici" };
}
