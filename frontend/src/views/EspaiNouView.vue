<script setup lang="ts">
import { useCreaEspai } from "../composables/useCreaEspai";

const { camps, errorsCamp, errorGlobal, enviant, enviar } = useCreaEspai();
</script>

<template>
  <main class="pantalla">
    <h1>Defineix un espai</h1>
    <p>El nom el trieu vosaltres (Sala 1 o Sala Pau Casals). L’aforament és el màxim de persones.</p>

    <p v-if="errorGlobal" class="error-global" role="alert">{{ errorGlobal }}</p>

    <form class="formulari" @submit.prevent="enviar">
      <div class="camp">
        <label for="name">Nom de l’espai</label>
        <input id="name" v-model="camps.name" name="name" autocomplete="off" required />
        <p v-if="errorsCamp.name" class="camp__error">{{ errorsCamp.name }}</p>
      </div>

      <div class="camp">
        <label for="capacity">Aforament</label>
        <input
          id="capacity"
          v-model="camps.capacity"
          name="capacity"
          type="number"
          min="1"
          step="1"
          required
        />
        <p v-if="errorsCamp.capacity" class="camp__error">{{ errorsCamp.capacity }}</p>
      </div>

      <div class="camp">
        <label for="equipment">Equipament (opcional)</label>
        <input id="equipment" v-model="camps.equipment" name="equipment" autocomplete="off" />
      </div>

      <div class="accions">
        <button class="boto boto--primari" type="submit" :disabled="enviant">
          {{ enviant ? "Desant…" : "Desar l’espai" }}
        </button>
      </div>
    </form>
  </main>
</template>
