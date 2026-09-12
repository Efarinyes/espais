<script setup lang="ts">
import FinestresDisponibilitat from "../components/FinestresDisponibilitat.vue";
import { useEditaEspai } from "../composables/useEditaEspai";

const { camps, dies, errorsCamp, errorGlobal, carregant, enviant, trobat, enviar } = useEditaEspai();
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-6">
    <h1 class="text-3xl font-semibold">Edita l’espai</h1>
    <p class="mt-2 text-base-content/80">
      Podeu canviar el nom, l’aforament, l’equipament i l’horari. Desactivar no esborra l’espai.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>
    <p v-else-if="carregant" class="mt-6">Carregant…</p>

    <form v-if="!carregant && trobat" class="mt-6 space-y-4" @submit.prevent="enviar">
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

      <fieldset class="fieldset">
        <label class="label cursor-pointer justify-start gap-3 min-h-11" for="active">
          <input id="active" v-model="camps.active" class="checkbox" name="active" type="checkbox" />
          <span>
            Espai actiu
            <span class="block font-normal text-base-content/70">
              Si el desactiveu, no s’esborra l’historial; només s’impedeixen reserves noves.
            </span>
          </span>
        </label>
      </fieldset>

      <FinestresDisponibilitat v-model="dies" />
      <p v-if="errorsCamp.windows" class="text-error">{{ errorsCamp.windows }}</p>

      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Desant…" : "Desar els canvis" }}
      </button>
    </form>
  </main>
</template>
