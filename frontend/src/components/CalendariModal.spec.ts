import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import CalendariModal from "./CalendariModal.vue";
import type { ModalCalendari } from "../composables/useCalendariReserves";

const reserva = {
  id: "r1",
  space_id: "s1",
  space_name: "Sala 1",
  starts_at: "2026-09-08T08:00:00Z",
  ends_at: "2026-09-08T09:00:00Z",
  status: "confirmed" as const,
  mine: true,
  coordinator_name: "Carla",
  attendance_count: null,
  capacity: 40,
  min_attendance: null,
  exceeds_capacity: false,
  below_min_attendance: false,
};

const base = {
  resumPendent: "",
  resumDetall: "Sala 1: dimarts",
  duradaMinuts: 60,
  duradaDetall: 60,
  durades: [30, 60],
  enviant: false,
  campAssistencia: "",
  errorDetall: "",
  okDetall: "",
  avisAforament: "",
  enviantAssistencia: false,
  potAnular: true,
  enviantAnulacio: false,
  potReprogramar: true,
  reprogramacioAmbAvis: true,
  diaHorari: "2026-09-08",
  horaHorari: "10:00",
  diesReservables: "dimarts",
  enviantReprogramacio: false,
  potRegistrarAssistencia: true,
};

describe("CalendariModal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });
  it("obra el diàleg amb nom accessible i l’error de creació a dins", () => {
    const modal: ModalCalendari = {
      tipus: "crear",
      franja: { starts_at: reserva.starts_at, ends_at: reserva.ends_at },
    };
    const wrapper = mount(CalendariModal, {
      props: { ...base, modal, resumPendent: "Reservar Sala 1", errorDetall: "Aquest interval ja està ocupat." },
    });
    const dialeg = wrapper.get("dialog").element as HTMLDialogElement;
    expect(dialeg.open).toBe(true);
    expect(dialeg.getAttribute("aria-labelledby")).toBe("confirma-titol");
    expect(wrapper.text()).toContain("Aquest interval ja està ocupat.");
    expect(wrapper.get("button[aria-pressed='true']").text()).toContain("1 h");
    wrapper.unmount();
  });

  it("en anul·lar el focus inicial és l’opció menys destructiva", async () => {
    const modal: ModalCalendari = { tipus: "confirmar-anulacio", reserva };
    const wrapper = mount(CalendariModal, { props: { ...base, modal }, attachTo: document.body });
    expect(document.activeElement).toBe(wrapper.get("button").element);
    expect(wrapper.get("button").text()).toBe("Enrere");
    expect(wrapper.text()).toContain("S’avisarà el coordinador");
    expect(wrapper.text()).toContain("Anul·la i avisa");
    wrapper.unmount();
  });

  it("Escape durant l’enviament no tanca el diàleg", () => {
    const modal: ModalCalendari = {
      tipus: "crear",
      franja: { starts_at: reserva.starts_at, ends_at: reserva.ends_at },
    };
    const wrapper = mount(CalendariModal, {
      props: { ...base, modal, enviant: true },
    });
    const dialeg = wrapper.get("dialog").element as HTMLDialogElement;
    const cancel = new Event("cancel", { cancelable: true });
    dialeg.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(wrapper.emitted("tancar")).toBeUndefined();
    wrapper.unmount();
  });

  it("el coordinador veu que la reserva és del responsable i no té accions de canvi", () => {
    const modal: ModalCalendari = { tipus: "detall", reserva: { ...reserva, managed_by_responsible: true } };
    const wrapper = mount(CalendariModal, {
      props: { ...base, modal, potAnular: false, potReprogramar: false },
    });
    expect(wrapper.get("[data-reserva-bloquejada]").text()).toContain("El responsable ha modificat aquesta reserva");
    expect(wrapper.text()).not.toContain("Anul·la");
    expect(wrapper.text()).not.toContain("Canvia l’horari");
    expect(wrapper.find("[data-estat-avis]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("una reserva normal no mostra l’avís de bloqueig", () => {
    const modal: ModalCalendari = { tipus: "detall", reserva };
    const wrapper = mount(CalendariModal, { props: { ...base, modal } });
    expect(wrapper.find("[data-reserva-bloquejada]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("el responsable veu si el coordinador encara no ha llegit l’avís", () => {
    const modal: ModalCalendari = {
      tipus: "detall",
      reserva: {
        ...reserva,
        managed_by_responsible: true,
        notice: {
          notification_id: "n1",
          type: "reservation_rescheduled",
          created_at: "2026-09-08T10:00:00Z",
          read_at: null,
        },
      },
    };
    const wrapper = mount(CalendariModal, { props: { ...base, modal } });
    expect(wrapper.get("[data-estat-avis]").text()).toBe(
      "Avís de modificació al coordinador: pendent de lectura.",
    );
    expect(wrapper.find("[data-reserva-bloquejada]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("el responsable veu quan el coordinador ha llegit l’avís dins d’Espais", () => {
    const modal: ModalCalendari = {
      tipus: "detall",
      reserva: {
        ...reserva,
        managed_by_responsible: true,
        notice: {
          notification_id: "n1",
          type: "reservation_rescheduled",
          created_at: "2026-09-08T10:00:00Z",
          read_at: "2026-09-08T11:30:00Z",
        },
      },
    };
    const wrapper = mount(CalendariModal, { props: { ...base, modal } });
    const text = wrapper.get("[data-estat-avis]").text();
    expect(text).toContain("Avís de modificació al coordinador: llegit el");
    expect(text).not.toContain("pendent");
    wrapper.unmount();
  });

  describe("Persones previstes", () => {
    const nova = {
      espais: [{ id: "s1", name: "Sala 1" }],
      espaiId: "s1",
      dia: "2026-09-08",
      hora: "10:00",
      resum: "Reservar Sala 1",
      valida: true,
      error: "",
    };
    const modals: [string, ModalCalendari][] = [
      ["nova reserva", { tipus: "nova" }],
      ["confirmació de reserva", { tipus: "crear", franja: { starts_at: reserva.starts_at, ends_at: reserva.ends_at } }],
      ["detall de la reserva", { tipus: "detall", reserva }],
    ];

    it.each(modals)("%s mostra el camp com «Persones previstes», opcional i sense parlar d’assistència", (_nom, modal) => {
      const wrapper = mount(CalendariModal, { props: { ...base, modal, nova } });
      const camp = wrapper.get("input#persones-previstes");
      expect(wrapper.get("label[for='persones-previstes']").text()).toBe("Persones previstes (opcional)");
      expect(camp.attributes("required")).toBeUndefined();
      expect(camp.attributes("aria-describedby")).toContain("persones-previstes-ajuda");
      const text = wrapper.text();
      expect(text).not.toMatch(/assist/i);
      expect(text).not.toContain("Nombre d’assistents");
      wrapper.unmount();
    });

    it("el formulari de creació es pot enviar sense omplir el camp", async () => {
      const modal: ModalCalendari = { tipus: "nova" };
      const wrapper = mount(CalendariModal, { props: { ...base, modal, nova } });
      expect((wrapper.get("input#persones-previstes").element as HTMLInputElement).value).toBe("");
      await wrapper.get("form").trigger("submit");
      expect(wrapper.emitted("confirmar")).toHaveLength(1);
      wrapper.unmount();
    });

    it("escriure al camp emet el valor tal com s’ha escrit", async () => {
      const modal: ModalCalendari = { tipus: "crear", franja: { starts_at: reserva.starts_at, ends_at: reserva.ends_at } };
      const wrapper = mount(CalendariModal, { props: { ...base, modal } });
      await wrapper.get("input#persones-previstes").setValue("12");
      expect(wrapper.emitted("update:campAssistencia")?.[0]).toEqual(["12"]);
      wrapper.unmount();
    });

    it("el detall desa amb un botó que parla de persones previstes", () => {
      const modal: ModalCalendari = { tipus: "detall", reserva };
      const wrapper = mount(CalendariModal, { props: { ...base, modal } });
      expect(wrapper.text()).toContain("Desa les persones previstes");
      wrapper.unmount();
    });

    it("mostra l’avís suau d’aforament en crear i no desactiva cap botó", () => {
      const modal: ModalCalendari = { tipus: "nova" };
      const avis = "Les persones previstes superen l’aforament de l’espai. Pots continuar igualment.";
      const wrapper = mount(CalendariModal, { props: { ...base, modal, nova, avisAforament: avis, campAssistencia: "80" } });
      expect(wrapper.get("[data-avis-aforament]").text()).toBe(avis);
      expect(wrapper.get("button[type='submit']").attributes("disabled")).toBeUndefined();
      wrapper.unmount();
    });

    it("el detall d’un responsable que no pot desar no mostra el camp", () => {
      const modal: ModalCalendari = { tipus: "detall", reserva };
      const wrapper = mount(CalendariModal, { props: { ...base, modal, potRegistrarAssistencia: false } });
      expect(wrapper.find("input#persones-previstes").exists()).toBe(false);
      wrapper.unmount();
    });
  });
});
