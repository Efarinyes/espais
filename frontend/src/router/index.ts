import { createRouter, createWebHistory } from "vue-router";

import { calVerificarSessio, decisioAcces, esPrivada, metaDeRuta } from "../autoritzacio";
import TaulerLayout from "../components/TaulerLayout.vue";
import { refrescarSessio } from "../confirmacioSessio";
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
import PoliticaCookiesView from "../views/PoliticaCookiesView.vue";
import RecuperarAccesView from "../views/RecuperarAccesView.vue";
import RegistreView from "../views/RegistreView.vue";
import VerificarCorreuView from "../views/VerificarCorreuView.vue";

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.name === "politica-cookies") {
      return { top: 0 };
    }
    return false;
  },
  routes: [
    { path: "/", name: "inici", component: IniciView },
    { path: "/registre", name: "registre", component: RegistreView, meta: metaDeRuta("registre") },
    {
      path: "/iniciar-sessio",
      name: "iniciar-sessio",
      component: IniciSessioView,
      meta: metaDeRuta("iniciar-sessio"),
    },
    {
      path: "/recuperar",
      name: "recuperar-acces",
      component: RecuperarAccesView,
    },
    {
      path: "/verificar",
      name: "verificar-correu",
      component: VerificarCorreuView,
    },
    {
      path: "/politica-de-cookies",
      name: "politica-cookies",
      component: PoliticaCookiesView,
    },
    {
      path: "/espais",
      component: TaulerLayout,
      children: [
        { path: "", name: "espais", component: EspaisView, meta: metaDeRuta("espais") },
        { path: "nou", name: "espai-nou", component: EspaiNouView, meta: metaDeRuta("espai-nou") },
        { path: ":id", name: "espai-editar", component: EspaiEditarView, meta: metaDeRuta("espai-editar") },
      ],
    },
    {
      path: "/calendari",
      component: TaulerLayout,
      children: [{ path: "", name: "calendari", component: CalendariView, meta: metaDeRuta("calendari") }],
    },
    {
      path: "/avisos",
      component: TaulerLayout,
      children: [{ path: "", name: "avisos", component: AvisosView, meta: metaDeRuta("avisos") }],
    },
    {
      path: "/analisi",
      component: TaulerLayout,
      children: [{ path: "", name: "analisi", component: AnalisiView, meta: metaDeRuta("analisi") }],
    },
    {
      path: "/coordinadors/convidar",
      component: TaulerLayout,
      children: [
        {
          path: "",
          name: "convidar-coordinador",
          component: ConvidaCoordinadorView,
          meta: metaDeRuta("convidar-coordinador"),
        },
      ],
    },
    {
      path: "/entitat/colors",
      component: TaulerLayout,
      children: [
        { path: "", name: "colors-entitat", component: ColorsEntitatView, meta: metaDeRuta("colors-entitat") },
      ],
    },
    {
      path: "/invitar/:token",
      name: "acceptar-invitacio",
      component: AcceptaInvitacioView,
      meta: metaDeRuta("acceptar-invitacio"),
    },
  ],
});

function estatSessio() {
  const sessio = useSessioStore();
  return { iniciada: sessio.iniciada, confirmada: sessio.confirmada, role: sessio.role };
}

router.beforeEach(async (to) => {
  const sessio = useSessioStore();
  if (calVerificarSessio(to.name, sessio)) {
    const resultat = await refrescarSessio();
    if (resultat === "error" && esPrivada(to.name) && to.name !== "inici") {
      return { name: "inici" };
    }
  }
  const desti = decisioAcces(to.name, estatSessio());
  if (desti !== true && desti.name === to.name) {
    return true;
  }
  return desti;
});
