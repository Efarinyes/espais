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
});
