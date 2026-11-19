<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { useAvisosStore } from "../stores/avisos";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const avisos = useAvisosStore();
const route = useRoute();

const visible = computed(
  () => sessio.role === "coordinator" && avisos.noLlegits > 0 && route.name !== "avisos",
);
const text = computed(() =>
  avisos.noLlegits === 1
    ? "Tens 1 avís nou: una reserva teva s’ha modificat o anul·lat."
    : `Tens ${avisos.noLlegits} avisos nous: reserves teves s’han modificat o anul·lat.`,
);
</script>

<template>
  <RouterLink
    v-if="visible"
    class="alert alert-warning mb-6 flex min-h-11 items-center justify-between gap-3 no-underline"
    to="/avisos"
    role="status"
    data-avisos-pendents
  >
    <span class="font-medium">{{ text }}</span>
    <span class="btn btn-sm shrink-0">Obre els avisos</span>
  </RouterLink>
</template>
