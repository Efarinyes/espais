import { describe, expect, it, beforeEach } from "vitest";

import { CLAU_AVIS_COOKIES, avisCookiesTancat, useAvisCookies } from "./useAvisCookies";

describe("useAvisCookies", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("a la primera visita l’avís és visible i no escriu res", () => {
    const { visible } = useAvisCookies();
    expect(visible.value).toBe(true);
    expect(localStorage.getItem(CLAU_AVIS_COOKIES)).toBeNull();
  });

  it("un valor que no és el tancament no amaga l’avís", () => {
    localStorage.setItem(CLAU_AVIS_COOKIES, "acceptat");
    expect(avisCookiesTancat("acceptat")).toBe(false);
    expect(useAvisCookies().visible.value).toBe(true);
  });

  it("si ja s’ha tancat, l’avís no es mostra", () => {
    localStorage.setItem(CLAU_AVIS_COOKIES, "tancat");
    expect(useAvisCookies().visible.value).toBe(false);
  });

  it("tancar desa només aquesta clau i amaga l’avís", () => {
    const avis = useAvisCookies();
    avis.tancar();
    expect(avis.visible.value).toBe(false);
    expect(localStorage.getItem(CLAU_AVIS_COOKIES)).toBe("tancat");
    expect(Object.keys(localStorage)).toEqual([CLAU_AVIS_COOKIES]);
    expect(useAvisCookies().visible.value).toBe(false);
  });
});
