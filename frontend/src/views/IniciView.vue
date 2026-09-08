<script setup lang="ts">
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
</script>

<template>
  <main>
    <h1>Espais</h1>
    <p>Gestió d’ús i reserva d’espais de l’entitat. Ús intern i gratuït.</p>
    <p v-if="!sessio.iniciada">Encara no hi ha sessió. L’alta d’entitat arribarà a la fase d’identitat.</p>
  </main>
</template>
