import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";
import { createAnalisiApi, analisiApiKey } from "./services/analisi";
import { createAvisosApi, avisosApiKey } from "./services/avisos";
import { createEspaisApi, espaisApiKey } from "./services/espais";
import { createIdentityApi, identityApiKey } from "./services/identitat";
import { createReservesApi, reservesApiKey } from "./services/reserves";
import { createDisparadorPolling, disparadorCalendariKey } from "./calendariLive";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.provide(identityApiKey, createIdentityApi());
app.provide(espaisApiKey, createEspaisApi());
app.provide(reservesApiKey, createReservesApi());
app.provide(avisosApiKey, createAvisosApi());
app.provide(analisiApiKey, createAnalisiApi());
app.provide(disparadorCalendariKey, createDisparadorPolling());
app.use(router);
app.mount("#app");
