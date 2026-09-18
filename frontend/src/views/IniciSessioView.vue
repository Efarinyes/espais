<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useIniciSessio } from "../composables/useIniciSessio";

const { camps, errorsCamp, errorGlobal, enviant, enviar } = useIniciSessio();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="text-3xl font-semibold">Inicia sessió</h1>
    <p class="mt-2 text-base-content/80">Entra amb l’email i la contrasenya del teu compte a l’entitat.</p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="enviar">
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

      <fieldset class="fieldset">
        <label class="label" for="password">Contrasenya</label>
        <input
          id="password"
          v-model="camps.password"
          class="input w-full min-h-11"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          :aria-invalid="Boolean(errorsCamp.password) || undefined"
          :aria-describedby="errorsCamp.password ? 'password-error' : undefined"
        />
        <p v-if="errorsCamp.password" id="password-error" class="text-error" role="alert">{{ errorsCamp.password }}</p>
      </fieldset>

      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Entrant…" : "Entrar" }}
      </button>
    </form>

    <p class="mt-6">
      <RouterLink class="link link-primary" to="/registre">Registra una entitat nova</RouterLink>
    </p>
  </main>
</template>
