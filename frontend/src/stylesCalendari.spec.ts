import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("estils del calendari", () => {
  it("mostra el títol curt de la casella i amaga les persones", () => {
    expect(css).toContain(".calendari-espais .sx__time-grid-event-title");
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*text-overflow:\s*ellipsis/);
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*white-space:\s*nowrap/);
    expect(css).toMatch(/sx__time-grid-event-people[\s\S]*display:\s*none/);
    expect(css).toContain(".reserva-ocupada");
    expect(css).toContain(".reserva-propia");
    expect(css).not.toContain(".reserva-tramat-");
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*font-size:\s*0\.75rem/);
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*font-weight:\s*500/);
    expect(css).toContain("--tipus-titol: 1.75rem");
    expect(css).toContain("--fora-horari:");
    const reglesEvent = css.split(".calendari-espais .sx__time-grid-event-inner")[1] ?? "";
    expect(reglesEvent).not.toContain("--fora-horari");
  });
});
