<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useVerificarCorreu } from "../composables/useVerificarCorreu";

const {
  camps,
  errorsCamp,
  pas,
  missatge,
  errorGlobal,
  enllacInvalid,
  enviant,
  demanar,
  confirmar,
  demanarEnllacNou,
} = useVerificarCorreu();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="titol-pantalla">Verifica el correu</h1>
    <p v-if="pas === 'confirmar' && !enllacInvalid" class="mt-2 text-base-content/80">
      Confirma que aquest correu és teu per activar el compte i l’entitat.
    </p>
    <p v-else-if="pas === 'demanar'" class="mt-2 text-base-content/80">
      Escriu l’email del registre. Si està pendent de verificar, rebràs un enllaç que caduca al cap de 24 hores.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>
    <button
      v-if="enllacInvalid && pas === 'confirmar'"
      class="btn btn-primary min-h-11 w-full mt-4"
      type="button"
      @click="demanarEnllacNou"
    >
      Demana un enllaç nou
    </button>

    <template v-if="pas === 'fet'">
      <div class="alert alert-success mt-6" role="status">
        <span>{{ missatge }}</span>
      </div>
      <RouterLink class="btn btn-primary min-h-11 w-full mt-4" to="/iniciar-sessio">Inicia sessió</RouterLink>
    </template>

    <template v-else>
      <div v-if="missatge" class="alert alert-info mt-6" role="status">
        <span>{{ missatge }}</span>
      </div>

      <form v-if="pas === 'confirmar' && !enllacInvalid" class="mt-6" @submit.prevent="confirmar">
        <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
          {{ enviant ? "Activant…" : "Activa el compte" }}
        </button>
      </form>

      <form v-if="pas === 'demanar'" class="mt-6 space-y-4" @submit.prevent="demanar">
        <fieldset class="fieldset">
          <label class="label" for="email">Email</label>
          <input
            id="email"
            v-model="camps.email"
            class="input w-full min-h-11"
            name="email"
            type="email"
            autocomplete="username"
            required
            :aria-invalid="Boolean(errorsCamp.email) || undefined"
            :aria-describedby="errorsCamp.email ? 'email-error' : undefined"
          />
          <p v-if="errorsCamp.email" id="email-error" class="text-error" role="alert">{{ errorsCamp.email }}</p>
        </fieldset>
        <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
          {{ enviant ? "Enviant…" : "Envia l’enllaç" }}
        </button>
      </form>

      <p class="mt-6">
        <RouterLink class="link link-primary" to="/iniciar-sessio">Torna a iniciar sessió</RouterLink>
      </p>
    </template>
  </main>
</template>
