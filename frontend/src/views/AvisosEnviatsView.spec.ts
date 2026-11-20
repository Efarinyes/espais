import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";

import AvisosEnviatsView from "./AvisosEnviatsView.vue";
import { ApiError } from "../services/http";
import {
  avisosEnviatsApiKey,
  type AvisEnviatDto,
  type AvisosEnviatsApi,
} from "../services/avisosEnviats";
import type { SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioResp: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: null,
};

function enviat(overrides: Partial<AvisEnviatDto> = {}): AvisEnviatDto {
  return {
    id: "n1",
    type: "reservation_rescheduled",
    reservation_id: "r1",
    coordinator_name: "Carla",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    new_starts_at: "2026-09-09T16:00:00Z",
    new_ends_at: "2026-09-09T17:00:00Z",
    changes: ["date", "start_time", "end_time"],
    reservation_status: "confirmed",
    created_at: "2026-09-08T10:00:00Z",
    read_at: null,
    ...overrides,
  };
}

function muntar(api: AvisosEnviatsApi["llistar"]) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioResp);
  return mount(AvisosEnviatsView, {
    global: {
      plugins: [pinia],
      provide: { [avisosEnviatsApiKey as symbol]: { llistar: api } satisfies AvisosEnviatsApi },
    },
  });
}

describe("AvisosEnviatsView", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("explica que encara no hi ha cap avís", async () => {
    const wrapper = muntar(async () => []);
    await flushPromises();
    expect(wrapper.text()).toContain("Encara no has enviat cap avís");
  });

  it("diu si cada avís és pendent de lectura o llegit i quan", async () => {
    const wrapper = muntar(async () => [
      enviat({ id: "n1" }),
      enviat({
        id: "n2",
        type: "reservation_cancelled",
        new_starts_at: null,
        new_ends_at: null,
        changes: [],
        reservation_status: "cancelled",
        read_at: "2026-09-08T11:30:00Z",
      }),
    ]);
    await flushPromises();
    const [pendent, llegit] = wrapper.findAll("article");
    expect(pendent.attributes("data-llegit")).toBe("false");
    expect(pendent.text()).toContain("Modificada");
    expect(pendent.text()).toContain("Pendent de lectura");
    expect(pendent.text()).toContain("Coordinador: Carla");
    expect(pendent.text()).toContain("Nou horari:");
    expect(pendent.text()).toContain("Ha canviat el dia, l’hora d’inici i l’hora de fi.");
    expect(llegit.attributes("data-llegit")).toBe("true");
    expect(llegit.text()).toContain("Anul·lada");
    expect(llegit.text()).toMatch(/Llegit el /);
    expect(llegit.text()).not.toContain("Pendent de lectura");
    expect(llegit.text()).not.toContain("Nou horari");
    expect(wrapper.get("[role='status']").text()).toBe("1 avís pendent de lectura.");
  });

  it("resumeix quan tot s’ha llegit", async () => {
    const wrapper = muntar(async () => [enviat({ read_at: "2026-09-08T11:30:00Z" })]);
    await flushPromises();
    expect(wrapper.get("[role='status']").text()).toBe("Tots els avisos s’han llegit.");
  });

  it("deixa clar que el push no compta com a lectura", async () => {
    const wrapper = muntar(async () => []);
    await flushPromises();
    expect(wrapper.text()).toContain("una notificació al dispositiu no compta com a lectura");
  });

  it("mostra l’error del servidor", async () => {
    const wrapper = muntar(async () => {
      throw new ApiError("només el responsable", 403);
    });
    await flushPromises();
    expect(wrapper.get("[role='alert']").text()).toBe("només el responsable");
    expect(wrapper.text()).not.toContain("Encara no has enviat cap avís");
  });

  describe("presentació", () => {
    const modificat = enviat({ id: "n1", coordinator_name: "Josep Oriol" });
    const anullat = enviat({
      id: "n2",
      type: "reservation_cancelled",
      new_starts_at: null,
      new_ends_at: null,
      changes: [],
      reservation_status: "cancelled",
      read_at: "2026-09-08T11:30:00Z",
    });

    it("l’etiqueta de tipus és un badge amb padding i vora definits, no un text enganxat", async () => {
      const wrapper = muntar(async () => [modificat, anullat]);
      await flushPromises();
      const etiqueta = wrapper.get("article .badge");
      expect(etiqueta.text()).toBe("Modificada");
      expect(etiqueta.classes()).toContain("badge-warning");
      const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
      expect(css).toMatch(/\.badge\s*\{[^}]*--border:\s*1px/);
    });

    it("té una versió de targetes en una columna i una taula per a pantalles amples", async () => {
      const wrapper = muntar(async () => [modificat, anullat]);
      await flushPromises();
      const targetes = wrapper.get("[data-avisos-targetes]");
      expect(targetes.classes()).toContain("@3xl:hidden");
      expect(targetes.findAll("article")).toHaveLength(2);
      const taula = wrapper.get("[data-avisos-taula]");
      expect(taula.classes()).toEqual(expect.arrayContaining(["hidden", "@3xl:table"]));
      expect(wrapper.get("main").classes()).not.toContain("max-w-md");
    });

    it("la taula té capçaleres i una fila per avís amb els mateixos fets que la targeta", async () => {
      const wrapper = muntar(async () => [modificat, anullat]);
      await flushPromises();
      const taula = wrapper.get("[data-avisos-taula]");
      expect(taula.findAll("thead th").map((th) => th.text())).toEqual([
        "Avís",
        "Espai i coordinador",
        "Horari original",
        "Nou horari",
        "Enviat i lectura",
      ]);
      const [pendent, llegit] = taula.findAll("[data-fila-avis]");
      expect(pendent.attributes("data-llegit")).toBe("false");
      expect(pendent.text()).toContain("Modificada");
      expect(pendent.text()).toContain("Sala 1");
      expect(pendent.text()).toContain("Josep Oriol");
      expect(pendent.text()).toContain("Pendent de lectura");
      expect(pendent.text()).toContain("Ha canviat el dia, l’hora d’inici i l’hora de fi.");
      expect(pendent.text()).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
      expect(pendent.text()).not.toContain("Llegit ");
      expect(llegit.attributes("data-llegit")).toBe("true");
      expect(llegit.text()).toContain("Anul·lada");
      expect(llegit.text()).toContain("Llegit");
      expect(llegit.text()).toContain("Sense nou horari");
      expect(llegit.text()).not.toContain("Pendent de lectura");
      expect(llegit.text()).not.toContain("Ha canviat");
    });

    it("un coordinador sense nom no deixa un buit a la taula", async () => {
      const wrapper = muntar(async () => [enviat({ coordinator_name: null })]);
      await flushPromises();
      const fila = wrapper.get("[data-fila-avis]");
      expect(fila.get("th[scope='row']").text()).toBe("Sala 1");
    });

    it("sense avisos no es dibuixa ni la taula ni les targetes", async () => {
      const wrapper = muntar(async () => []);
      await flushPromises();
      expect(wrapper.find("[data-avisos-taula]").exists()).toBe(false);
      expect(wrapper.find("[data-avisos-targetes]").exists()).toBe(false);
    });
  });
});
