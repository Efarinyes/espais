import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";
import { createIdentityApi, identityApiKey } from "./services/identitat";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.provide(identityApiKey, createIdentityApi());
app.use(router);
app.mount("#app");
