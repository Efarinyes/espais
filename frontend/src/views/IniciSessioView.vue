<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useIniciSessio } from "../composables/useIniciSessio";

const {
  camps,
  errorsCamp,
  errorGlobal,
  calVerificar,
  calTornar,
  enviant,
  pas,
  codiRebut,
  horaCaducitat,
  enviar,
  verificar,
  tornar,
} = useIniciSessio();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="titol-pantalla">Inicia sessió</h1>
    <p v-if="pas === 'credencials'" class="mt-2 text-base-content/80">
      Entra amb l’email i la contrasenya del teu compte a l’entitat.
    </p>
    <p v-else class="mt-2 text-base-content/80">
      Introdueix el codi que ha arribat a aquesta finestra. No s’envia a cap altre dispositiu.
    </p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>
    <p v-if="calVerificar" class="mt-4">
      <RouterLink class="link link-primary" to="/verificar">Torna a enviar el correu de verificació</RouterLink>
    </p>

    <form v-if="pas === 'credencials'" class="mt-6 space-y-4" @submit.prevent="enviar">
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

    <form v-else class="mt-6 space-y-4" @submit.prevent="verificar">
      <p class="text-sm text-base-content/80">Codi rebut en aquesta finestra</p>
      <p id="codi-rebut" class="font-mono text-2xl tracking-widest" aria-live="polite">
        {{ codiRebut || "Esperant el codi…" }}
      </p>
      <p v-if="horaCaducitat">El codi caduca a les {{ horaCaducitat }}.</p>

      <fieldset class="fieldset">
        <label class="label" for="codi">Codi</label>
        <input
          id="codi"
          v-model="camps.codi"
          class="input w-full min-h-11"
          name="codi"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          :disabled="calTornar"
          :aria-invalid="Boolean(errorsCamp.codi) || undefined"
          :aria-describedby="errorsCamp.codi ? 'codi-error' : undefined"
        />
        <p v-if="errorsCamp.codi" id="codi-error" class="text-error" role="alert">{{ errorsCamp.codi }}</p>
      </fieldset>

      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant || !codiRebut || calTornar">
        {{ enviant ? "Verificant…" : "Verifica" }}
      </button>
      <button class="btn btn-ghost min-h-11 w-full" type="button" @click="tornar">Torna a començar</button>
    </form>

    <template v-if="pas === 'credencials'">
      <p class="mt-6">
        <RouterLink class="link link-primary" to="/recuperar">Has oblidat la contrasenya?</RouterLink>
      </p>
      <p class="mt-3">
        <RouterLink class="link link-primary" to="/registre">Registra una entitat nova</RouterLink>
      </p>
    </template>
  </main>
</template>
