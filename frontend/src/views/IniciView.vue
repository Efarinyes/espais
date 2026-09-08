<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
</script>

<template>
  <main class="pantalla">
    <template v-if="!sessio.iniciada">
      <h1>Espais</h1>
      <p>Gestió d’ús i reserva d’espais de l’entitat. Ús intern i gratuït.</p>
      <div class="accions">
        <RouterLink class="boto boto--primari" to="/registre">Registra l’entitat</RouterLink>
        <RouterLink class="boto boto--secundari" to="/iniciar-sessio">Inicia sessió</RouterLink>
      </div>
    </template>

    <template v-else>
      <h1>{{ sessio.entityName }}</h1>
      <p v-if="sessio.typology">{{ sessio.typology }}</p>
      <p>Hola, {{ sessio.userName }}. Encara no hi ha espais.</p>

      <section class="buit" aria-labelledby="buit-titol">
        <h2 id="buit-titol">Defineix el primer espai</h2>
        <p>Els espais són vostres; el nom el decideix l’entitat.</p>
        <button class="boto boto--primari" type="button" disabled>
          Defineix el primer espai
        </button>
        <p>Convidar coordinadors es podrà fer més endavant; no cal per començar.</p>
      </section>
    </template>
  </main>
</template>
