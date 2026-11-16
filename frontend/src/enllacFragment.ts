import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

export function fragmentCru(hash: string): string {
  return hash.startsWith("#") ? hash.slice(1) : "";
}

export function decodificaToken(cru: string): string {
  try {
    return decodeURIComponent(cru).trim();
  } catch {
    return "";
  }
}

export function treuFragment(router: Router, route: RouteLocationNormalizedLoaded): void {
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
  void router.replace({ path: route.path, query: route.query, hash: "" });
}
