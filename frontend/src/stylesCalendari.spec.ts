import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("estils del calendari", () => {
  it("manté el text de la casella ocult i el gris només al marge", () => {
    expect(css).toContain(".calendari-espais .sx__time-grid-event-title");
    expect(css).toMatch(/sx__time-grid-event-title[\s\S]*display:\s*none/);
    expect(css).toContain("--fora-horari:");
    const reglesEvent = css.split(".calendari-espais .sx__time-grid-event-inner")[1] ?? "";
    expect(reglesEvent).not.toContain("--fora-horari");
  });
});
