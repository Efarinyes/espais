import { createRouter, createWebHistory } from "vue-router";

import { useSessioStore } from "../stores/sessio";
import EspaiEditarView from "../views/EspaiEditarView.vue";
import EspaiNouView from "../views/EspaiNouView.vue";
import EspaisView from "../views/EspaisView.vue";
import IniciSessioView from "../views/IniciSessioView.vue";
import IniciView from "../views/IniciView.vue";
import RegistreView from "../views/RegistreView.vue";

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
    { path: "/espais", name: "espais", component: EspaisView, meta: { requiresAuth: true } },
    { path: "/espais/nou", name: "espai-nou", component: EspaiNouView, meta: { requiresAuth: true } },
    {
      path: "/espais/:id",
      name: "espai-editar",
      component: EspaiEditarView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to) => {
  const sessio = useSessioStore();
  if (to.meta.requiresAuth && !sessio.iniciada) {
    return { name: "iniciar-sessio" };
  }
  if (to.meta.guestOnly && sessio.iniciada) {
    return { name: "inici" };
  }
  return true;
});
