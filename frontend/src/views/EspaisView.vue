<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useLlistaEspais } from "../composables/useLlistaEspais";

const { espais, carregant, error } = useLlistaEspais();
</script>

<template>
  <main class="pantalla">
    <h1>Espais de l’entitat</h1>

    <p v-if="error" class="error-global" role="alert">{{ error }}</p>
    <p v-else-if="carregant">Carregant…</p>

    <section v-else-if="espais.length === 0" class="buit" aria-labelledby="buit-espais">
      <h2 id="buit-espais">Encara no heu definit cap espai</h2>
      <p>El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).</p>
      <RouterLink class="boto boto--primari" to="/espais/nou">Defineix el primer espai</RouterLink>
    </section>

    <ul v-else class="llista">
      <li v-for="espai in espais" :key="espai.id">
        <strong>{{ espai.name }}</strong>
        <span>Aforament: {{ espai.capacity }}</span>
      </li>
    </ul>

    <div v-if="espais.length > 0" class="accions">
      <RouterLink class="boto boto--primari" to="/espais/nou">Afegeix un espai</RouterLink>
    </div>
  </main>
</template>
