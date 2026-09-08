import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";
import { createEspaisApi, espaisApiKey } from "./services/espais";
import { createIdentityApi, identityApiKey } from "./services/identitat";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.provide(identityApiKey, createIdentityApi());
app.provide(espaisApiKey, createEspaisApi());
app.use(router);
app.mount("#app");
