import { createRouter, createWebHistory } from "vue-router";

import IniciView from "../views/IniciView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", name: "inici", component: IniciView }],
});
