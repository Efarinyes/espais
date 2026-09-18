export const MODE_STORAGE_KEY = "espais.mode";
export const LEGACY_STORAGE_KEY = "espais.aparenca";
export const SESSIO_STORAGE_KEY = "espais.sessio";

export const PALETES = [
  { id: "mar-cel", etiqueta: "Mar i cel", tocs: ["#0B5ED7", "#14B8A6", "#BFDBFE"] },
  { id: "camps", etiqueta: "Camps i cereals", tocs: ["#F7B955", "#6B8E5A", "#C96F4A"] },
  { id: "citrics", etiqueta: "Cítrics i sol", tocs: ["#F97316", "#FACC15", "#4CAF50"] },
  { id: "vinyes", etiqueta: "Vinyes i muntanya al mar", tocs: ["#9B2C3D", "#8B5CF6", "#D6C8B6"] },
] as const;

export type PaletaId = (typeof PALETES)[number]["id"];
export type ModeAparenca = "clar" | "fosc";

export type AparencaDesada = {
  paleta: PaletaId;
  mode: ModeAparenca;
};

export const PALETA_PER_DEFECTE: PaletaId = "mar-cel";
export const MODE_PER_DEFECTE: ModeAparenca = "clar";

export const APARENCA_PER_DEFECTE: AparencaDesada = {
  paleta: PALETA_PER_DEFECTE,
  mode: MODE_PER_DEFECTE,
};

export function esPaletaId(valor: string): valor is PaletaId {
  return PALETES.some((item) => item.id === valor);
}

export function nomTema(paleta: PaletaId, mode: ModeAparenca): string {
  return mode === "fosc" ? `${paleta}-dark` : paleta;
}

export function paletaDe(valor: string | undefined | null): PaletaId {
  return typeof valor === "string" && esPaletaId(valor) ? valor : PALETA_PER_DEFECTE;
}

export function llegirAparenca(raw: string | null): AparencaDesada {
  if (!raw) {
    return { ...APARENCA_PER_DEFECTE };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AparencaDesada>;
    const paleta = paletaDe(parsed.paleta);
    const mode: ModeAparenca = parsed.mode === "fosc" ? "fosc" : "clar";
    return { paleta, mode };
  } catch {
    return { ...APARENCA_PER_DEFECTE };
  }
}

export function llegirMode(raw: string | null, legacyRaw: string | null = null): ModeAparenca {
  if (raw === "fosc" || raw === "clar") {
    return raw;
  }
  return llegirAparenca(legacyRaw).mode;
}

export function llegirPaletaEntitat(sessioRaw: string | null): PaletaId {
  if (!sessioRaw) {
    return PALETA_PER_DEFECTE;
  }
  try {
    const parsed = JSON.parse(sessioRaw) as { palette?: unknown };
    return paletaDe(typeof parsed.palette === "string" ? parsed.palette : null);
  } catch {
    return PALETA_PER_DEFECTE;
  }
}

export function aplicarTema(paleta: PaletaId, mode: ModeAparenca): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", nomTema(paleta, mode));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
    if (primary) {
      meta.setAttribute("content", primary);
    }
  }
}
