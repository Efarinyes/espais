<script setup lang="ts">
import { computed, onMounted } from "vue";

import { usePush } from "../composables/usePush";

const { estat, ocupat, error, inicialitzar, activar, desactivar } = usePush();

onMounted(() => {
  void inicialitzar();
});

const visible = computed(() => estat.value !== "carregant" && estat.value !== "desactivat-servidor");
</script>

<template>
  <section
    v-if="visible"
    class="card bg-base-100 shadow-sm"
    aria-labelledby="notificacions-dispositiu"
    data-activa-push
  >
    <div class="card-body gap-2">
      <h2 id="notificacions-dispositiu" class="card-title text-base">Notificacions al dispositiu</h2>

      <template v-if="estat === 'actiu'">
        <p>Aquest dispositiu rebrà un avís quan el responsable modifiqui o anul·li una reserva teva.</p>
        <div class="card-actions">
          <button class="btn btn-outline min-h-11" type="button" :disabled="ocupat" @click="desactivar">
            {{ ocupat ? "Desactivant…" : "Desactiva les notificacions" }}
          </button>
        </div>
      </template>

      <template v-else-if="estat === 'inactiu'">
        <p>Rep un avís al mòbil o a l’ordinador quan el responsable modifiqui o anul·li una reserva teva.</p>
        <div class="card-actions">
          <button class="btn btn-primary min-h-11" type="button" :disabled="ocupat" @click="activar">
            {{ ocupat ? "Activant…" : "Activa les notificacions" }}
          </button>
        </div>
      </template>

      <p v-else-if="estat === 'bloquejat'">
        Has bloquejat les notificacions d’Espais en aquest navegador. Per rebre-les, permet-les als ajustos del
        navegador i torna a carregar la pàgina.
      </p>

      <p v-else-if="estat === 'cal-instalar'">
        A l’iPhone i a l’iPad cal afegir Espais a la pantalla d’inici i obrir-lo des d’allà per poder rebre
        notificacions.
      </p>

      <p v-else-if="estat === 'no-suportat'">
        Aquest navegador no pot rebre notificacions fora d’Espais. Els avisos continuaran sortint aquí.
      </p>

      <p v-if="error" class="text-error" role="alert">{{ error }}</p>
      <p class="text-sm text-base-content/70">
        Una notificació al dispositiu no compta com a llegida: l’avís es marca com a llegit quan l’obres a Espais.
      </p>
    </div>
  </section>
</template>
