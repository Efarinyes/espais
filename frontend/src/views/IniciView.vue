<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";

import { destiDespresSessio } from "../navegacio";
import { useSessioStore } from "../stores/sessio";
import LandingPage from "./LandingPage.vue";

const sessio = useSessioStore();
const router = useRouter();

watch(
  () => sessio.iniciada,
  (iniciada) => {
    if (iniciada) {
      void router.replace(destiDespresSessio(sessio.role));
    }
  },
  { immediate: true },
);
</script>

<template>
  <LandingPage v-if="!sessio.iniciada" />
</template>
