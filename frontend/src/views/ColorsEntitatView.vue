<script setup lang="ts">
import SelectorPaletaEntitat from "../components/SelectorPaletaEntitat.vue";
</script>

<template>
  <main>
    <h1 class="text-3xl font-semibold">Colors de l’entitat</h1>
    <p class="mt-2 text-base-content/80">
      Aquests colors els veu tothom de l’entitat. El clar o fosc el tria cadascú al capçal.
    </p>
    <div class="mt-6 max-w-md">
      <SelectorPaletaEntitat />
    </div>
  </main>
</template>
