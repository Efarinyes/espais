<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useLlistaEspais } from "../composables/useLlistaEspais";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const { espais, carregant } = useLlistaEspais();
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
      <p>Hola, {{ sessio.userName }}.</p>

      <section v-if="!carregant && espais.length === 0" class="buit" aria-labelledby="buit-titol">
        <h2 id="buit-titol">Defineix el primer espai</h2>
        <p>Encara no heu definit cap espai. El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).</p>
        <RouterLink class="boto boto--primari" to="/espais/nou">Defineix el primer espai</RouterLink>
        <p>Convidar coordinadors es podrà fer més endavant; no cal per començar.</p>
      </section>

      <section v-else-if="!carregant" class="buit" aria-labelledby="llista-titol">
        <h2 id="llista-titol">Els vostres espais</h2>
        <ul class="llista">
          <li v-for="espai in espais" :key="espai.id">
            <strong>{{ espai.name }}</strong>
            <span>Aforament: {{ espai.capacity }}</span>
          </li>
        </ul>
        <RouterLink class="boto boto--secundari" to="/espais">Veure tots els espais</RouterLink>
      </section>
    </template>
  </main>
</template>
