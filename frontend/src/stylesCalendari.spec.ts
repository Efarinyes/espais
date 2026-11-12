import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("estils del calendari", () => {
  it("mostra el títol curt de la casella i amaga les persones", () => {
    expect(css).toContain(".calendari-espais .sx__time-grid-event-title");
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*line-clamp:\s*2/);
    expect(css).toMatch(/sx__time-grid-event-people[\s\S]*display:\s*none/);
    expect(css).toContain(".reserva-ocupada");
    expect(css).toContain(".reserva-propia");
    const blocs = [...css.matchAll(/\.reserva-tramat-\d \{[\s\S]*?\n\}/g)].map((coincidencia) => coincidencia[0]);
    expect(blocs).toHaveLength(6);
    expect(new Set(blocs).size).toBe(6);
    expect(blocs.some((bloc) => bloc.includes("radial-gradient"))).toBe(true);
    expect(blocs.some((bloc) => bloc.includes("repeating-conic-gradient"))).toBe(true);
    expect(blocs.some((bloc) => bloc.includes("to right"))).toBe(true);
    expect(blocs.some((bloc) => bloc.includes("45deg"))).toBe(true);
    expect(blocs.some((bloc) => bloc.includes("0deg"))).toBe(true);
    expect(css).not.toContain("7px 14px");
    expect(blocs.some((bloc) => bloc.includes("90deg"))).toBe(false);
    expect(css).toContain("--tipus-titol: 1.75rem");
    expect(css).toContain("--fora-horari:");
    const reglesEvent = css.split(".calendari-espais .sx__time-grid-event-inner")[1] ?? "";
    expect(reglesEvent).not.toContain("--fora-horari");
  });
});
