<script setup lang="ts">
import FinestresDisponibilitat from "../components/FinestresDisponibilitat.vue";
import { useCreaEspai } from "../composables/useCreaEspai";

const { camps, dies, errorsCamp, errorGlobal, enviant, enviar } = useCreaEspai();
</script>

<template>
  <main class="w-full max-w-5xl">
    <h1 class="text-3xl font-semibold">Defineix un espai</h1>
    <p class="mt-2 text-base-content/80">
      El nom el trieu vosaltres (Sala 1 o Sala Pau Casals). L’aforament és el màxim de persones.
      La disponibilitat són els dies i hores en què es podrà reservar.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="enviar">
      <fieldset class="fieldset">
        <label class="label" for="name">Nom de l’espai</label>
        <input id="name" v-model="camps.name" class="input w-full min-h-11" name="name" autocomplete="off" required />
        <p v-if="errorsCamp.name" class="text-error">{{ errorsCamp.name }}</p>
      </fieldset>

      <fieldset class="fieldset">
        <label class="label" for="capacity">Aforament</label>
        <input
          id="capacity"
          v-model="camps.capacity"
          class="input w-full min-h-11"
          name="capacity"
          type="number"
          min="1"
          step="1"
          required
        />
        <p v-if="errorsCamp.capacity" class="text-error">{{ errorsCamp.capacity }}</p>
      </fieldset>

      <fieldset class="fieldset">
        <label class="label" for="equipment">Equipament (opcional)</label>
        <input id="equipment" v-model="camps.equipment" class="input w-full min-h-11" name="equipment" autocomplete="off" />
      </fieldset>

      <FinestresDisponibilitat v-model="dies" />
      <p v-if="errorsCamp.windows" class="text-error">{{ errorsCamp.windows }}</p>

      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Desant…" : "Desar l’espai" }}
      </button>
    </form>
  </main>
</template>
