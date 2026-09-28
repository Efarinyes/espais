<script setup lang="ts">
import { RouterView } from "vue-router";

import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import { useSincronitzaSessio } from "./composables/useSincronitzaSessio";

useSincronitzaSessio();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <a class="skip-link" href="#contingut">Ves al contingut</a>
    <AppHeader />
    <div id="contingut" class="flex-1">
      <RouterView />
    </div>
    <AppFooter />
  </div>
</template>
