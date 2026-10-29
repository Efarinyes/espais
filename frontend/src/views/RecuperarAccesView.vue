<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useRecuperarAcces } from "../composables/useRecuperarAcces";

const { camps, errorsCamp, missatge, errorGlobal, enviant, calContrasenya, demanar, confirmar } =
  useRecuperarAcces();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="text-3xl font-semibold">Recupera l’accés</h1>
    <p v-if="calContrasenya" class="mt-2 text-base-content/80">Tria una contrasenya nova per al teu compte.</p>
    <p v-else class="mt-2 text-base-content/80">
      Escriu l’email del compte. Si existeix, rebràs un enllaç que caduca al cap d’una hora.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>
    <div v-if="missatge" class="alert alert-info mt-6" role="status">
      <span>{{ missatge }}</span>
    </div>

    <form v-if="calContrasenya" class="mt-6 space-y-4" @submit.prevent="confirmar">
      <fieldset class="fieldset">
        <label class="label" for="password">Contrasenya nova</label>
        <input
          id="password"
          v-model="camps.password"
          class="input w-full min-h-11"
          name="password"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(errorsCamp.password) || undefined"
          :aria-describedby="errorsCamp.password ? 'password-error' : undefined"
        />
        <p v-if="errorsCamp.password" id="password-error" class="text-error" role="alert">
          {{ errorsCamp.password }}
        </p>
      </fieldset>
      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Desant…" : "Desa la contrasenya" }}
      </button>
    </form>

    <form v-else class="mt-6 space-y-4" @submit.prevent="demanar">
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
  </main>
</template>
