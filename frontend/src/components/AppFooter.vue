<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

const anyPeu = computed(() => new Date().getFullYear());
</script>

<template>
  <footer class="mx-4 mb-6 mt-8 rounded-box bg-base-100 px-4 py-3 text-sm text-base-content/70 shadow-sm">
    <p>© {{ anyPeu }} Eduard Farinyes · Codi obert · ús intern</p>
    <p class="mt-1">
      <RouterLink class="inline-flex min-h-11 items-center underline" to="/politica-de-cookies">
        Política de cookies
      </RouterLink>
    </p>
  </footer>
</template>
