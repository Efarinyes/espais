<script setup lang="ts">
import { useConvidaCoordinador } from "../composables/useConvidaCoordinador";

const { camps, errorsCamp, errorGlobal, enviant, enllacComplet, copiat, enviar, copiarEnllac } =
  useConvidaCoordinador();
</script>

<template>
  <main class="w-full max-w-md">
    <h1 class="text-3xl font-semibold">Convida un coordinador</h1>
    <p class="mt-2 text-base-content/80">
      Crea un enllaç i envia’l tu. Encara no enviem correu. Caduca al cap de 14 dies.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="enviar">
      <fieldset class="fieldset">
        <label class="label" for="email">Email del coordinador</label>
        <input
          id="email"
          v-model="camps.email"
          class="input w-full min-h-11"
          name="email"
          type="email"
          autocomplete="email"
          required
          :aria-invalid="Boolean(errorsCamp.email) || undefined"
          :aria-describedby="errorsCamp.email ? 'email-error' : undefined"
        />
        <p v-if="errorsCamp.email" id="email-error" class="text-error" role="alert">{{ errorsCamp.email }}</p>
      </fieldset>
      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Creant invitació…" : "Crear invitació" }}
      </button>
    </form>

    <section v-if="enllacComplet" class="card bg-base-100 shadow-sm mt-6" aria-labelledby="enllac-titol">
      <div class="card-body">
        <h2 id="enllac-titol" class="card-title">Enllaç per copiar</h2>
        <label class="sr-only" for="accept_url">Enllaç d’invitació</label>
        <input id="accept_url" class="input w-full min-h-11" :value="enllacComplet" readonly />
        <button class="btn btn-outline min-h-11" type="button" @click="copiarEnllac">
          {{ copiat ? "Copiat" : "Copia l’enllaç" }}
        </button>
      </div>
    </section>
  </main>
</template>
