import { describe, expect, it } from "vitest";

import { arcsDonut } from "./donut";

describe("arcsDonut", () => {
  it("reparteix el cercle segons el valor de cada part i deixa un petit espai entre elles", () => {
    const arcs = arcsDonut([
      { id: "a", valor: 3, color: "red" },
      { id: "b", valor: 1, color: "blue" },
    ]);
    expect(arcs).toHaveLength(2);
    expect(arcs[0]?.dashoffset).toBe(-0);
    expect(arcs[0]?.dasharray).toBe("74.2 25.8");
    expect(arcs[1]?.dashoffset).toBe(-75);
    expect(arcs[1]?.dasharray).toBe("24.2 75.8");
  });

  it("una sola part ocupa tot el cercle sense espai", () => {
    expect(arcsDonut([{ id: "a", valor: 5, color: "red" }])[0]?.dasharray).toBe("100 0");
  });

  it("amb un total, la part és la fracció d’aquest total i la resta queda a la pista", () => {
    const arcs = arcsDonut([{ id: "ocupades", valor: 42, color: "red" }], 160);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.dasharray).toBe("26.25 73.75");
  });

  it("una part que passa del total es talla a 100 i no dibuixa res més enllà", () => {
    const arcs = arcsDonut([{ id: "a", valor: 200, color: "red" }], 100);
    expect(arcs[0]?.dasharray).toBe("100 0");
  });

  it("sense valors o sense total no dibuixa cap arc", () => {
    expect(arcsDonut([])).toEqual([]);
    expect(arcsDonut([{ id: "a", valor: 0, color: "red" }])).toEqual([]);
    expect(arcsDonut([{ id: "a", valor: 5, color: "red" }], 0)).toEqual([]);
  });
});
