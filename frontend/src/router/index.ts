import { createRouter, createWebHistory } from "vue-router";

import { useSessioStore } from "../stores/sessio";
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
  ],
});

router.beforeEach((to) => {
  const sessio = useSessioStore();
  if (to.meta.guestOnly && sessio.iniciada) {
    return { name: "inici" };
  }
  return true;
});
