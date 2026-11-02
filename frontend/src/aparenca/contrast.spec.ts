import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { relacioContrast } from "./contrast";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function temes(): Map<string, Record<string, string>> {
  const resultat = new Map<string, Record<string, string>>();
  for (const bloc of css.split('@plugin "daisyui/theme"').slice(1)) {
    const nom = bloc.match(/name:\s*"([^"]+)"/)?.[1];
    if (!nom) {
      continue;
    }
    const colors: Record<string, string> = {};
    for (const coincidencia of bloc.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
      colors[coincidencia[1]] = coincidencia[2].toLowerCase();
    }
    resultat.set(nom, colors);
  }
  return resultat;
}

const parells = ["primary", "secondary", "accent", "success", "warning", "error"] as const;

describe("contrast dels tokens publicats", () => {
  it("mesura els vuit temes sense canviar els hex que ja no arriben a 4,5:1", () => {
    const tots = temes();
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
    const insuficients: string[] = [];
    for (const [nom, colors] of tots) {
      for (const paper of parells) {
        const fons = colors[paper];
        const text = colors[`${paper}-content`];
        expect(fons, `${nom} ${paper}`).toMatch(/^#[0-9a-f]{6}$/);
        expect(text, `${nom} ${paper}-content`).toMatch(/^#[0-9a-f]{6}$/);
        const relacio = relacioContrast(fons, text);
        expect(relacio).toBeGreaterThan(1);
        if (relacio < 4.5) {
          insuficients.push(`${nom} ${paper} ${text} sobre ${fons} ${relacio.toFixed(2)}`);
        }
      }
    }
    expect(insuficients.length).toBeGreaterThan(0);
    expect(tots.get("mar-cel")?.secondary).toBe("#14b8a6");
    expect(tots.get("citrics")?.primary).toBe("#f97316");
    expect(tots.get("camps")?.secondary).toBe("#6b8e5a");
    expect(tots.get("camps")?.accent).toBe("#c96f4a");
    expect(tots.get("vinyes")?.secondary).toBe("#8b5cf6");
    expect(tots.get("camps")?.["primary-content"]).not.toBe("#ffffff");
    expect(tots.get("citrics")?.["warning-content"]).not.toBe("#ffffff");
  });
});
