<script setup lang="ts">
import { onMounted } from "vue";

import AvisosEnviatsTargetes from "../components/avisos/AvisosEnviatsTargetes.vue";
import AvisosEnviatsTaula from "../components/avisos/AvisosEnviatsTaula.vue";
import { useAvisosEnviats } from "../composables/useAvisosEnviats";

const { avisos, carregant, error, pendents, carregar } = useAvisosEnviats();

onMounted(() => {
  void carregar();
});
</script>

<template>
  <main class="w-full max-w-5xl">
    <h1 class="titol-pantalla">Avisos enviats</h1>
    <p class="mt-2 max-w-2xl text-base-content/80">
      Avisos que els coordinadors han rebut quan has modificat o anul·lat una reserva seva. «Llegit» vol dir que
      l’han obert dins d’Espais; una notificació al dispositiu no compta com a lectura.
    </p>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-if="carregant && avisos.length === 0" class="mt-6">Carregant…</p>

    <section
      v-else-if="!carregant && avisos.length === 0 && !error"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="buit-enviats"
    >
      <div class="card-body">
        <h2 id="buit-enviats" class="card-title">Encara no has enviat cap avís</h2>
        <p>Quan modifiquis o anul·lis una reserva d’un coordinador, aquí veuràs si ho ha llegit.</p>
      </div>
    </section>

    <template v-else-if="avisos.length">
      <p class="mt-6 font-medium" role="status">
        {{ pendents === 0 ? "Tots els avisos s’han llegit." : pendents === 1 ? "1 avís pendent de lectura." : `${pendents} avisos pendents de lectura.` }}
      </p>
      <!-- Una columna de targetes en pantalles estretes; dues columnes de targetes a partir de 36 rem i taula a partir de 48 rem de contingut. -->
      <div class="@container mt-4">
        <AvisosEnviatsTargetes class="max-w-md @xl:max-w-none @3xl:hidden" :avisos="avisos" />
        <AvisosEnviatsTaula class="hidden @3xl:table" :avisos="avisos" />
      </div>
    </template>
  </main>
</template>
