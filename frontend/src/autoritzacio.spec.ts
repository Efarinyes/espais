import { describe, expect, it } from "vitest";

import { router } from "./router";
import {
  POLITICA_RUTES,
  accesDeNom,
  calVerificarSessio,
  decisioAcces,
  esPrivada,
  potAccedir,
  type RolConegut,
  type SessioAcces,
} from "./autoritzacio";

const responsable: SessioAcces = { iniciada: true, confirmada: true, role: "responsible" };
const coordinador: SessioAcces = { iniciada: true, confirmada: true, role: "coordinator" };
const anonima: SessioAcces = { iniciada: false, confirmada: true, role: "" };

const propies = {
  responsible: ["espai-nou", "espai-editar", "analisi", "convidar-coordinador", "colors-entitat"],
  coordinator: ["avisos"],
} as const;

const compartides = ["espais", "calendari"] as const;

describe("política de rutes", () => {
  it("cada ruta amb nom del router té una política", () => {
    const noms = router
      .getRoutes()
      .map((ruta) => ruta.name)
      .filter((nom): nom is string => typeof nom === "string");
    expect(noms.length).toBeGreaterThan(0);
    for (const nom of noms) {
      expect(accesDeNom(nom)).not.toBe("desconeguda");
    }
  });

  it("una ruta desconeguda no es tracta com a pública", () => {
    expect(esPrivada("no-existeix")).toBe(true);
    expect(decisioAcces("no-existeix", anonima)).toEqual({ name: "iniciar-sessio" });
  });

  it("sense sessió, les privades van a iniciar sessió i les públiques es queden", () => {
    for (const nom of [...compartides, ...propies.responsible, ...propies.coordinator]) {
      expect(decisioAcces(nom, anonima)).toEqual({ name: "iniciar-sessio" });
    }
    for (const nom of ["inici", "politica-cookies", "recuperar-acces", "verificar-correu", "registre", "iniciar-sessio"] as const) {
      expect(decisioAcces(nom, anonima)).toBe(true);
    }
  });

  it("cada rol entra a les seves rutes i a les compartides, i no a les de l’altre", () => {
    const rols: RolConegut[] = ["responsible", "coordinator"];
    for (const rol of rols) {
      const sessio = rol === "responsible" ? responsable : coordinador;
      for (const nom of propies[rol]) {
        expect(potAccedir(nom, rol)).toBe(true);
        expect(decisioAcces(nom, sessio)).toBe(true);
      }
      for (const nom of compartides) {
        expect(potAccedir(nom, rol)).toBe(true);
      }
      const altres = rol === "responsible" ? propies.coordinator : propies.responsible;
      for (const nom of altres) {
        expect(potAccedir(nom, rol)).toBe(false);
        expect(decisioAcces(nom, sessio)).toEqual({ name: "espais" });
      }
    }
  });

  it("la ruta de retorn és compartida i una denegació no redirigeix en bucle", () => {
    expect(POLITICA_RUTES.espais).toBe("compartida");
    const sessions = [anonima, responsable, coordinador, { iniciada: true, confirmada: false, role: "responsible" }];
    for (const nom of Object.keys(POLITICA_RUTES)) {
      for (const sessio of sessions) {
        const desti = decisioAcces(nom, sessio);
        if (desti === true) {
          continue;
        }
        const segona = decisioAcces(desti.name, sessio);
        expect(segona === true || segona.name === desti.name).toBe(true);
      }
    }
  });

  it("una sessió desada encara no confirmada no obre una ruta privada", () => {
    const pendent = { iniciada: true, confirmada: false, role: "responsible" };
    expect(calVerificarSessio("analisi", pendent)).toBe(true);
    expect(calVerificarSessio("inici", pendent)).toBe(true);
    expect(calVerificarSessio("politica-cookies", pendent)).toBe(false);
    expect(calVerificarSessio("recuperar-acces", pendent)).toBe(false);
    expect(calVerificarSessio("verificar-correu", pendent)).toBe(false);
    expect(decisioAcces("analisi", pendent)).toEqual({ name: "iniciar-sessio" });
  });
});
