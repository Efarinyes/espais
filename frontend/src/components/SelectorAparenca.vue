<script setup lang="ts">
import { useAparencaStore } from "../stores/aparenca";

const aparenca = useAparencaStore();
</script>

<template>
  <div class="join" role="group" aria-label="Mode de pantalla">
    <button
      id="mode-clar"
      class="btn btn-ghost join-item min-h-11"
      type="button"
      :class="{ 'btn-active': aparenca.mode === 'clar' }"
      :aria-pressed="aparenca.mode === 'clar'"
      @click="aparenca.setMode('clar')"
    >
      Clar
    </button>
    <button
      id="mode-fosc"
      class="btn btn-ghost join-item min-h-11"
      type="button"
      :class="{ 'btn-active': aparenca.mode === 'fosc' }"
      :aria-pressed="aparenca.mode === 'fosc'"
      @click="aparenca.setMode('fosc')"
    >
      Fosc
    </button>
  </div>
</template>
