<script setup lang="ts">
import { computed } from "vue";

const anyPeu = computed(() => new Date().getFullYear());
</script>

<template>
  <footer class="mx-4 mb-6 mt-8 rounded-box bg-base-100 px-4 py-3 text-sm text-base-content/70 shadow-sm">
    <p>© {{ anyPeu }} Eduard Farinyes · Codi obert · ús intern</p>
  </footer>
</template>
