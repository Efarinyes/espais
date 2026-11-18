import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { configuraConfirmacioSessio } from "./confirmacioSessio";
import { router } from "./router";
import { createAnalisiApi, analisiApiKey } from "./services/analisi";
import { createAvisosApi, avisosApiKey } from "./services/avisos";
import { createEspaisApi, espaisApiKey } from "./services/espais";
import { createIdentityApi, identityApiKey } from "./services/identitat";
import { canalVerificacioKey, createCanalVerificacio } from "./services/canalVerificacio";
import { createReservesApi, reservesApiKey } from "./services/reserves";
import { createDisparadorPolling, disparadorCalendariKey } from "./calendariLive";
import "./styles.css";

const apiBase = "/api";
const identitat = createIdentityApi(apiBase);
configuraConfirmacioSessio((token) => identitat.obtenirSessio(token));

const app = createApp(App);
app.use(createPinia());
app.provide(identityApiKey, identitat);
app.provide(canalVerificacioKey, createCanalVerificacio());
app.provide(espaisApiKey, createEspaisApi(apiBase));
app.provide(reservesApiKey, createReservesApi(apiBase));
app.provide(avisosApiKey, createAvisosApi(apiBase));
app.provide(analisiApiKey, createAnalisiApi(apiBase));
app.provide(disparadorCalendariKey, createDisparadorPolling());
app.use(router);
app.mount("#app");
