<script setup lang="ts">
import { useInstalacio } from "../composables/useInstalacio";

const { potInstalar, esIos, instalar } = useInstalacio();
</script>

<template>
  <div v-if="potInstalar || esIos" class="bg-base-200 px-4 py-3">
    <button v-if="potInstalar" class="btn btn-primary min-h-11" type="button" @click="instalar">Instal·la</button>
    <p v-else>A Safari: Comparteix i, després, Afegeix a la pantalla d’inici.</p>
  </div>
</template>
