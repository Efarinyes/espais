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
});
