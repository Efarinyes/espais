import { createRouter, createWebHistory } from "vue-router";

import TaulerLayout from "../components/TaulerLayout.vue";
import { destiDespresSessio } from "../navegacio";
import { useSessioStore } from "../stores/sessio";
import AcceptaInvitacioView from "../views/AcceptaInvitacioView.vue";
import AnalisiView from "../views/AnalisiView.vue";
import AvisosView from "../views/AvisosView.vue";
import CalendariView from "../views/CalendariView.vue";
import ColorsEntitatView from "../views/ColorsEntitatView.vue";
import ConvidaCoordinadorView from "../views/ConvidaCoordinadorView.vue";
import EspaiEditarView from "../views/EspaiEditarView.vue";
import EspaiNouView from "../views/EspaiNouView.vue";
import EspaisView from "../views/EspaisView.vue";
import IniciSessioView from "../views/IniciSessioView.vue";
import IniciView from "../views/IniciView.vue";
import RegistreView from "../views/RegistreView.vue";

const metaAuth = { requiresAuth: true };
const metaResp = { requiresAuth: true, requiresResponsible: true };

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "inici", component: IniciView },
    { path: "/registre", name: "registre", component: RegistreView, meta: { guestOnly: true } },
    {
      path: "/iniciar-sessio",
      name: "iniciar-sessio",
      component: IniciSessioView,
      meta: { guestOnly: true },
    },
    {
      path: "/espais",
      component: TaulerLayout,
      children: [
        { path: "", name: "espais", component: EspaisView, meta: metaAuth },
        { path: "nou", name: "espai-nou", component: EspaiNouView, meta: metaResp },
        { path: ":id", name: "espai-editar", component: EspaiEditarView, meta: metaResp },
      ],
    },
    {
      path: "/calendari",
      name: "calendari",
      component: CalendariView,
      meta: metaAuth,
    },
    {
      path: "/avisos",
      name: "avisos",
      component: AvisosView,
      meta: metaAuth,
    },
    {
      path: "/analisi",
      component: TaulerLayout,
      children: [{ path: "", name: "analisi", component: AnalisiView, meta: metaResp }],
    },
    {
      path: "/coordinadors/convidar",
      component: TaulerLayout,
      children: [
        { path: "", name: "convidar-coordinador", component: ConvidaCoordinadorView, meta: metaResp },
      ],
    },
    {
      path: "/entitat/colors",
      component: TaulerLayout,
      children: [{ path: "", name: "colors-entitat", component: ColorsEntitatView, meta: metaResp }],
    },
    {
      path: "/invitar/:token",
      name: "acceptar-invitacio",
      component: AcceptaInvitacioView,
      meta: { guestOnly: true },
    },
  ],
});

router.beforeEach((to) => {
  const sessio = useSessioStore();
  if (to.name === "inici" && sessio.iniciada && sessio.role === "responsible") {
    return destiDespresSessio(sessio.role);
  }
  if (to.meta.requiresAuth && !sessio.iniciada) {
    return { name: "iniciar-sessio" };
  }
  if (to.meta.requiresResponsible && sessio.role !== "responsible") {
    return { name: "inici" };
  }
  if (to.meta.guestOnly && sessio.iniciada) {
    return destiDespresSessio(sessio.role);
  }
  return true;
});
