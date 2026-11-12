import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PALETES } from "../aparenca";
import { relacioContrast } from "./contrast";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function colorsDe(bloc: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const coincidencia of bloc.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    colors[coincidencia[1]] = coincidencia[2].toLowerCase();
  }
  return colors;
}

function temes(): Map<string, Record<string, string>> {
  const resultat = new Map<string, Record<string, string>>();
  for (const bloc of css.split('@plugin "daisyui/theme"').slice(1)) {
    const nom = bloc.match(/name:\s*"([^"]+)"/)?.[1];
    if (!nom) {
      continue;
    }
    resultat.set(nom, colorsDe(bloc));
  }
  for (const coincidencia of css.matchAll(/\[data-theme="([^"]+)"\]\s*\{([^}]+)\}/g)) {
    const nom = coincidencia[1];
    const actual = resultat.get(nom) ?? {};
    resultat.set(nom, { ...actual, ...colorsDe(coincidencia[2]) });
  }
  return resultat;
}

const aprovats: Record<string, Record<string, string>> = {
  "mar-cel": {
    "base-100": "#f8fbfb",
    "base-200": "#f3f6f6",
    "base-300": "#6a7c84",
    "base-content": "#1a2428",
    primary: "#1b4f86",
    "primary-content": "#f5f9ff",
    secondary: "#2478a8",
    "secondary-content": "#ffffff",
    accent: "#5b767e",
    "accent-content": "#ffffff",
    heading: "#143e68",
    raised: "#ffffff",
    muted: "#4c5c64",
    selected: "#e3eef4",
    "on-selected": "#143e68",
    "primary-border": "#143e68",
    "secondary-border": "#2478a8",
    "accent-border": "#5b767e",
  },
  "mar-cel-dark": {
    "base-100": "#243440",
    "base-200": "#1c2a34",
    "base-300": "#8aa4b4",
    "base-content": "#e8f1f5",
    primary: "#7ebfde",
    "primary-content": "#0e2430",
    secondary: "#c5d5e0",
    "secondary-content": "#12202a",
    accent: "#d5e2ea",
    "accent-content": "#12202a",
    heading: "#d7e8f4",
    raised: "#2c3e4c",
    muted: "#b4c6d2",
    selected: "#34566a",
    "on-selected": "#e8f1f5",
    "primary-border": "#7ebfde",
    "secondary-border": "#c5d5e0",
    "accent-border": "#d5e2ea",
  },
  camps: {
    "base-100": "#fbf6e8",
    "base-200": "#f7f1dc",
    "base-300": "#8a7a58",
    "base-content": "#2a2416",
    primary: "#d4ae3a",
    "primary-content": "#2a2416",
    secondary: "#8e5a38",
    "secondary-content": "#ffffff",
    accent: "#e6d3a4",
    "accent-content": "#2a2416",
    heading: "#6a5018",
    raised: "#fffcf3",
    muted: "#5c5344",
    selected: "#f3e4b8",
    "on-selected": "#6a5018",
    "primary-border": "#7a5418",
    "secondary-border": "#8e5a38",
    "accent-border": "#7a5418",
  },
  "camps-dark": {
    "base-100": "#362c22",
    "base-200": "#2c241c",
    "base-300": "#c4a888",
    "base-content": "#f7f1e6",
    primary: "#e8c056",
    "primary-content": "#2a1c08",
    secondary: "#d4924e",
    "secondary-content": "#2a160c",
    accent: "#f0e0c4",
    "accent-content": "#2a2014",
    heading: "#f0d7a0",
    raised: "#403428",
    muted: "#e0d0b8",
    selected: "#4a3c2c",
    "on-selected": "#f7f1e6",
    "primary-border": "#e8c056",
    "secondary-border": "#d4924e",
    "accent-border": "#f0e0c4",
  },
  citrics: {
    "base-100": "#fffbe8",
    "base-200": "#fff6d4",
    "base-300": "#7a6230",
    "base-content": "#2a240e",
    primary: "#c25116",
    "primary-content": "#ffffff",
    secondary: "#9ad040",
    "secondary-content": "#1e2408",
    accent: "#f0d030",
    "accent-content": "#2a240e",
    heading: "#a34808",
    raised: "#fffef6",
    muted: "#5c5428",
    selected: "#ffe08a",
    "on-selected": "#a34808",
    "primary-border": "#a34808",
    "secondary-border": "#3f7a14",
    "accent-border": "#a34808",
  },
  "citrics-dark": {
    "base-100": "#24302a",
    "base-200": "#1c2420",
    "base-300": "#b0a080",
    "base-content": "#f7f6ee",
    primary: "#f0a030",
    "primary-content": "#2a1808",
    secondary: "#d6e85a",
    "secondary-content": "#1e2208",
    accent: "#8fcb55",
    "accent-content": "#14200c",
    heading: "#f6e27a",
    raised: "#2c3a32",
    muted: "#d5d2c0",
    selected: "#2a3828",
    "on-selected": "#f7f6ee",
    "primary-border": "#f0a030",
    "secondary-border": "#d6e85a",
    "accent-border": "#8fcb55",
  },
  vinyes: {
    "base-100": "#f8f6f1",
    "base-200": "#f3f1ea",
    "base-300": "#7e8a82",
    "base-content": "#1e2a26",
    primary: "#2f6b58",
    "primary-content": "#ffffff",
    secondary: "#2f7480",
    "secondary-content": "#ffffff",
    accent: "#c9bba6",
    "accent-content": "#1e2a26",
    heading: "#9a4e3a",
    raised: "#fdfcfa",
    muted: "#54605a",
    selected: "#dce8e2",
    "on-selected": "#9a4e3a",
    "primary-border": "#2f6b58",
    "secondary-border": "#2f7480",
    "accent-border": "#6e6256",
  },
  "vinyes-dark": {
    "base-100": "#1c342c",
    "base-200": "#142822",
    "base-300": "#6e9a8c",
    "base-content": "#e7f3ec",
    primary: "#4eae8c",
    "primary-content": "#0e2418",
    secondary: "#7eb8c8",
    "secondary-content": "#0e242c",
    accent: "#e6ddd2",
    "accent-content": "#241c16",
    heading: "#e4c2b4",
    raised: "#244038",
    muted: "#b7cdc2",
    selected: "#1e4a40",
    "on-selected": "#e7f3ec",
    "primary-border": "#4eae8c",
    "secondary-border": "#7eb8c8",
    "accent-border": "#e6ddd2",
  },
};

const semanticsClar = {
  success: "#146b38",
  "success-content": "#ffffff",
  "success-soft": "#c3e0cc",
  warning: "#7a4e00",
  "warning-content": "#ffffff",
  "warning-soft": "#eed7a4",
  info: "#1e4e78",
  "info-content": "#ffffff",
  "info-soft": "#c9dcf0",
  error: "#8e1d2a",
  "error-content": "#ffffff",
  "error-soft": "#f3cdd2",
  "error-solid": "#c4272e",
};

const semanticsFosc = {
  success: "#7dce9a",
  "success-content": "#062214",
  "success-soft": "#1e5238",
  warning: "#f2c56a",
  "warning-content": "#2a1c04",
  "warning-soft": "#62481e",
  info: "#a9d2f2",
  "info-content": "#062033",
  "info-soft": "#20445c",
  error: "#ffb4ba",
  "error-content": "#2a1216",
  "error-soft": "#6a3840",
  "error-solid": "#e07a86",
};

function minim(colors: Record<string, string>, text: string, fonsos: string[]): number {
  return Math.min(...fonsos.map((fons) => relacioContrast(colors[text], colors[fons])));
}

describe("contrast dels vuit temes aprovats", () => {
  const tots = temes();

  it("manté els identificadors de tema i els hex aprovats", () => {
    expect([...tots.keys()]).toEqual([
      "mar-cel",
      "mar-cel-dark",
      "camps",
      "camps-dark",
      "citrics",
      "citrics-dark",
      "vinyes",
      "vinyes-dark",
    ]);
    for (const [nom, esperat] of Object.entries(aprovats)) {
      const colors = tots.get(nom);
      for (const [token, hex] of Object.entries(esperat)) {
        expect(colors?.[token], `${nom} ${token}`).toBe(hex);
      }
    }
  });

  it("comparteix els colors semàntics i el nom visible de Vinyes no canvia l’id", () => {
    for (const nom of ["mar-cel", "camps", "citrics", "vinyes"]) {
      const colors = tots.get(nom);
      for (const [token, hex] of Object.entries(semanticsClar)) {
        expect(colors?.[token], `${nom} ${token}`).toBe(hex);
      }
    }
    for (const nom of ["mar-cel-dark", "camps-dark", "citrics-dark", "vinyes-dark"]) {
      const colors = tots.get(nom);
      for (const [token, hex] of Object.entries(semanticsFosc)) {
        expect(colors?.[token], `${nom} ${token}`).toBe(hex);
      }
    }
    expect(PALETES.map((item) => item.id)).toEqual(["mar-cel", "camps", "citrics", "vinyes"]);
    expect(PALETES.find((item) => item.id === "vinyes")?.etiqueta).toBe("Vinyes vora al mar");
    expect(css).toContain(".link-primary");
    expect(css).toContain("color: var(--color-heading);");
  });

  it("el text arriba a 4,5:1 i el límit d’un control a 3:1", () => {
    const insuficients: string[] = [];
    for (const [nom, colors] of tots) {
      const superfices = ["base-100", "base-200", "raised"];
      const parellsText: Array<[string, string]> = [
        ["base-content", "text"],
        ["muted", "text secundari"],
        ["heading", "títol"],
        ["primary-content", "primari"],
        ["secondary-content", "secundari"],
        ["accent-content", "accent"],
        ["on-selected", "selecció"],
        ["success", "èxit sobre el fons suau"],
        ["warning", "avís sobre el fons suau"],
        ["info", "informació sobre el fons suau"],
        ["error", "error sobre el fons suau"],
        ["success-content", "botó d’èxit"],
        ["warning-content", "botó d’avís"],
        ["info-content", "botó d’informació"],
        ["error-content", "botó d’error"],
      ];
      const fonsDelText: Record<string, string[]> = {
        "base-content": superfices,
        muted: superfices,
        heading: superfices,
        "primary-content": ["primary"],
        "secondary-content": ["secondary"],
        "accent-content": ["accent"],
        "on-selected": ["selected"],
        success: ["success-soft", ...superfices],
        warning: ["warning-soft", ...superfices],
        info: ["info-soft", ...superfices],
        error: ["error-soft", ...superfices],
        "success-content": ["success"],
        "warning-content": ["warning"],
        "info-content": ["info"],
        "error-content": ["error-solid"],
      };
      for (const [token, etiqueta] of parellsText) {
        const relacio = minim(colors, token, fonsDelText[token]);
        if (relacio < 4.5) {
          insuficients.push(`${nom} ${etiqueta} ${relacio.toFixed(2)}`);
        }
      }
      for (const vora of ["base-300", "primary-border", "secondary-border", "accent-border", "heading"]) {
        const relacio = minim(colors, vora, superfices);
        if (relacio < 3) {
          insuficients.push(`${nom} vora ${vora} ${relacio.toFixed(2)}`);
        }
      }
    }
    expect(insuficients).toEqual([]);
  });
});
