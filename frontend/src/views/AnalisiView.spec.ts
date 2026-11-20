import { describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { analisiApiKey, type AnalisiApi, type EspaiUsDto, type ResumUsDto } from "../services/analisi";
import { reservesApiKey, type ReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";
import AnalisiView from "./AnalisiView.vue";

function resum(): ResumUsDto {
  return {
    starts_at: "2026-08-31T22:00:00Z",
    ends_at: "2026-09-30T22:00:00Z",
    confirmed_count: 1,
    cancelled_count: 1,
    reserved_hours: 1,
    available_hours: 14,
    occupancy_ratio: 1 / 14,
    spaces: [
      {
        space_id: "s1",
        space_name: "Sala 1",
        capacity: 40,
        confirmed_count: 1,
        cancelled_count: 1,
        reserved_hours: 1,
        available_hours: 14,
        occupancy_ratio: 1 / 14,
      },
    ],
  };
}

function reserva(): ReservaDto {
  return {
    id: "r1",
    space_id: "s1",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    status: "confirmed",
    mine: false,
    coordinator_name: "Carla",
    attendance_count: 10,
    capacity: 40,
    min_attendance: 8,
    exceeds_capacity: false,
    below_min_attendance: false,
  };
}

function espaiUs(id: string, nom: string, over: Partial<EspaiUsDto> = {}): EspaiUsDto {
  return {
    space_id: id,
    space_name: nom,
    capacity: 40,
    confirmed_count: 0,
    cancelled_count: 0,
    reserved_hours: 0,
    available_hours: 40,
    occupancy_ratio: 0,
    ...over,
  };
}

/** Un resum coherent: els totals surten dels espais, com fa el backend. */
function resumDe(espais: EspaiUsDto[]): ResumUsDto {
  const reservades = espais.reduce((suma, e) => suma + e.reserved_hours, 0);
  const disponibles = espais.reduce((suma, e) => suma + e.available_hours, 0);
  return {
    starts_at: "2026-08-31T22:00:00Z",
    ends_at: "2026-09-30T22:00:00Z",
    confirmed_count: espais.reduce((suma, e) => suma + e.confirmed_count, 0),
    cancelled_count: espais.reduce((suma, e) => suma + e.cancelled_count, 0),
    reserved_hours: reservades,
    available_hours: disponibles,
    occupancy_ratio: disponibles > 0 ? reservades / disponibles : 0,
    spaces: espais,
  };
}

function tresEspais(): EspaiUsDto[] {
  return [
    espaiUs("a", "Sala A", {
      confirmed_count: 6,
      cancelled_count: 1,
      reserved_hours: 12,
      occupancy_ratio: 12 / 40,
    }),
    espaiUs("b", "Sala B", { confirmed_count: 3, reserved_hours: 4, occupancy_ratio: 4 / 40 }),
    espaiUs("c", "Sala C"),
  ];
}

type Opcions = {
  resum?: ResumUsDto;
  reserves?: ReservaDto[];
  hash?: string;
  resumPer?: (des: string) => ResumUsDto;
};

async function muntar(opcions: Opcions = {}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "tok",
    entity_id: "e1",
    user_id: "u1",
    role: "responsible",
    entity_name: "AAVV Barri A",
    user_name: "Anna",
    typology: "associació de veïns",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/analisi", name: "analisi", component: AnalisiView },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
    ],
  });
  await router.push(`/analisi${opcions.hash ?? ""}`);
  let trucades = 0;
  const desDemanats: string[] = [];
  const analisi: AnalisiApi = {
    resum: async (_token, des) => {
      trucades += 1;
      desDemanats.push(des);
      return opcions.resumPer ? opcions.resumPer(des) : (opcions.resum ?? resum());
    },
  };
  const reserves: ReservesApi = {
    llistar: async () => opcions.reserves ?? [reserva()],
    crear: async () => reserva(),
    registrarAssistencia: async () => reserva(),
    anular: async () => reserva(),
    reprogramar: async () => reserva(),
  };
  const wrapper = mount(AnalisiView, {
    // El desplaçament a l’espai fa servir `document.getElementById`: cal que el DOM hi sigui.
    attachTo: opcions.hash ? document.body : undefined,
    global: {
      plugins: [pinia, router],
      provide: {
        [analisiApiKey as symbol]: analisi,
        [reservesApiKey as symbol]: reserves,
      },
    },
  });
  await flushPromises();
  return { wrapper, router, trucades: () => trucades, desDemanats };
}

describe("AnalisiView", () => {
  it("substitueix el resum per la mostra d’exemple sense tornar a cridar l’API", async () => {
    const { wrapper, trucades } = await muntar();
    expect(wrapper.text()).toContain("Sala 1");
    expect(trucades()).toBe(1);
    await wrapper.get("input[type='checkbox']").setValue(true);
    await flushPromises();
    expect(wrapper.text()).toContain("Sala gran");
    expect(wrapper.text()).toContain("Això no són dades de la vostra entitat");
    expect(trucades()).toBe(1);
  });

  it("resumeix els indicadors i dibuixa els dos donuts amb les dades del resum", async () => {
    const { wrapper } = await muntar({ resum: resumDe(tresEspais()) });
    expect(wrapper.get("[data-kpi='ocupacio']").text()).toContain("13,3 %");
    expect(wrapper.get("[data-kpi='ocupacio']").text()).toContain("16 h de 120 h");
    expect(wrapper.get("[data-kpi='reserves']").text()).toContain("9");
    expect(wrapper.get("[data-kpi='reserves']").text()).toContain("1 anul·lada");
    expect(wrapper.get("[data-kpi='espai-actiu']").text()).toContain("Sala A");
    expect(wrapper.get("[data-kpi='espai-actiu']").text()).toContain("6 reserves");
    expect(wrapper.get("[data-grafic='ocupacio']").text()).toContain("104 h");
    expect(wrapper.findAll("[data-grafic='ocupacio'] [data-arc-donut]")).toHaveLength(1);
    const repartiment = wrapper.get("[data-grafic='repartiment']");
    expect(repartiment.findAll("[data-arc-donut]")).toHaveLength(2);
    expect(repartiment.get("[data-llegenda-repartiment]").text()).not.toContain("Sala C");
    expect(repartiment.get("[data-llegenda-repartiment]").text()).toContain("Sala A");
  });

  it("compara els espais del més al menys ocupat i no dibuixa cap targeta per espai", async () => {
    const { wrapper } = await muntar({ resum: resumDe(tresEspais().reverse()) });
    const files = wrapper.findAll("[data-fila-espai]");
    expect(files.map((fila) => fila.get("th .font-semibold").text())).toEqual(["Sala A", "Sala B", "Sala C"]);
    expect(files[0]?.get("[role='meter']").attributes("aria-valuenow")).toBe("30");
    expect(wrapper.find(".card").exists()).toBe(false);
  });

  it("ressalta l’espai que arriba des de la llista d’espais i hi desplaça", async () => {
    const desplaça = vi.fn();
    Element.prototype.scrollIntoView = desplaça;
    const { wrapper } = await muntar({ resum: resumDe(tresEspais()), hash: "#espai-b" });
    await flushPromises();
    expect(wrapper.get("#espai-b").attributes("aria-current")).toBe("true");
    expect(wrapper.get("#espai-a").attributes("aria-current")).toBeUndefined();
    expect(desplaça).toHaveBeenCalled();
    expect(desplaça.mock.contexts[0]).toBe(wrapper.get("#espai-b").element);
    expect(wrapper.find("[data-treu-ressaltat]").exists()).toBe(true);
    wrapper.unmount();
  });

  it("ordena les reserves del període cronològicament", async () => {
    const reserves = [
      { ...reserva(), id: "tard", space_name: "Sala tard", starts_at: "2026-09-20T08:00:00Z" },
      { ...reserva(), id: "d-hora", space_name: "Sala d’hora", starts_at: "2026-09-02T08:00:00Z" },
    ];
    const { wrapper } = await muntar({ reserves });
    const noms = wrapper.findAll("[data-fila-reserva]").map((fila) => fila.text());
    expect(noms[0]).toContain("Sala d’hora");
    expect(noms[1]).toContain("Sala tard");
  });

  it("no mostra cap indicador d’assistència, tingui o no persones previstes", async () => {
    // El backend encara respon camps d’assistència al resum: la pàgina els ha d’ignorar.
    const espais = tresEspais().map((espai) => ({
      ...espai,
      min_attendance: 10,
      average_attendance: 8,
      unregistered_count: 2,
      below_min_attendance: true,
    }));
    const resumAmbCampsAntics = {
      ...resumDe(espais),
      average_attendance: 8,
      unregistered_count: 5,
      below_min_attendance: true,
    } as unknown as ResumUsDto;
    const reserves = [
      { ...reserva(), id: "r-zero", attendance_count: 0, starts_at: "2026-09-08T08:00:00Z" },
      { ...reserva(), id: "r-previsio", attendance_count: 12, starts_at: "2026-09-09T08:00:00Z" },
      { ...reserva(), id: "r-sense", attendance_count: null, starts_at: "2026-09-10T08:00:00Z" },
    ];
    const { wrapper } = await muntar({ resum: resumAmbCampsAntics, reserves });
    const text = wrapper.text();
    expect(text).not.toMatch(/assist/i);
    expect(text).not.toContain("Sense registrar");
    expect(text).not.toContain("Sense dades");
    expect(text).not.toContain("Per sota del mínim");
    expect(wrapper.find("[data-kpi='assistencia']").exists()).toBe(false);
    expect(wrapper.find("[data-assistencia]").exists()).toBe(false);
    expect(wrapper.findAll("[data-indicadors] > div")).toHaveLength(3);
    const capcaleres = wrapper.findAll("[data-reserves-periode] thead th").map((th) => th.text());
    expect(capcaleres).toEqual(["Dia", "Horari", "Espai", "Coordinador", "Estat"]);
    for (const fila of wrapper.findAll("[data-fila-reserva]")) {
      expect(fila.findAll("td")).toHaveLength(4);
    }
  });

  it("una reserva sense persones previstes no crea cap avís ni estat visual a les estadístiques", async () => {
    const espais = [espaiUs("a", "Sala A", { confirmed_count: 4, reserved_hours: 8, occupancy_ratio: 0.2 })];
    const reserves = [{ ...reserva(), attendance_count: null }];
    const senseDades = await muntar({ resum: resumDe(espais), reserves });
    const ambDades = await muntar({
      resum: resumDe(espais),
      reserves: [{ ...reserva(), attendance_count: 7 }],
    });
    expect(senseDades.wrapper.html()).toBe(ambDades.wrapper.html());
    expect(senseDades.wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("no dibuixa donuts buits en un període sense reserves", async () => {
    const espais = [espaiUs("a", "Sala A"), espaiUs("b", "Sala B")];
    const { wrapper } = await muntar({ resum: resumDe(espais), reserves: [] });
    expect(wrapper.text()).toContain("Aquest mes no hi ha reserves");
    expect(wrapper.find("[data-grafic='repartiment'] svg").exists()).toBe(false);
    expect(wrapper.get("[data-grafic='repartiment']").text()).toContain("No hi ha cap reserva confirmada");
    expect(wrapper.find("[data-reserves-periode]").exists()).toBe(false);
    expect(wrapper.get("[data-kpi='espai-actiu']").text()).toContain("Cap reserva aquest període");
  });

  it("sense horari disponible no presenta un 0 % com si fos una ocupació", async () => {
    const espais = [espaiUs("a", "Sala A", { confirmed_count: 1, reserved_hours: 2, available_hours: 0 })];
    const { wrapper } = await muntar({ resum: resumDe(espais) });
    expect(wrapper.get("[data-kpi='ocupacio']").text()).toContain("Sense horari disponible");
    expect(wrapper.find("[data-grafic='ocupacio'] svg").exists()).toBe(false);
    expect(wrapper.get("[data-fila-espai]").find("[role='meter']").exists()).toBe(false);
  });

  it("sense espais ofereix definir-ne un", async () => {
    const { wrapper } = await muntar({ resum: resumDe([]) });
    expect(wrapper.text()).toContain("Encara no heu definit cap espai");
    expect(wrapper.find("[data-indicadors]").exists()).toBe(false);
  });

  it("ho actualitza tot en canviar de mes", async () => {
    const setembre = resumDe([espaiUs("a", "Sala A", { confirmed_count: 5, reserved_hours: 10, occupancy_ratio: 0.25 })]);
    const agost = resumDe([espaiUs("b", "Sala Agost", { confirmed_count: 2, reserved_hours: 4, occupancy_ratio: 0.1 })]);
    const { wrapper, desDemanats } = await muntar({
      resumPer: (des) => (des.startsWith("2026-07-31") ? agost : setembre),
    });
    expect(wrapper.get("[data-kpi='reserves']").text()).toContain("5");
    await wrapper.get("#mes").setValue("2026-08");
    await flushPromises();
    expect(desDemanats.at(-1)).toBe("2026-07-31T22:00:00Z");
    expect(wrapper.get("[data-kpi='reserves']").text()).toContain("2");
    expect(wrapper.get("[data-kpi='espai-actiu']").text()).toContain("Sala Agost");
    expect(wrapper.get("[data-comparativa]").text()).toContain("Sala Agost");
    expect(wrapper.get("[data-comparativa]").text()).not.toContain("Sala A ");
  });
});
