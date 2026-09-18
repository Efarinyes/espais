<script setup lang="ts">
import { useAcceptaInvitacio } from "../composables/useAcceptaInvitacio";

const { preview, carregant, errorCarrega, camps, errorsCamp, errorGlobal, enviant, enviar } =
  useAcceptaInvitacio();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <div v-if="carregant" class="mt-6" role="status">Carregant invitació…</div>

    <div v-else-if="errorCarrega" class="alert alert-error mt-6" role="alert">
      <span>{{ errorCarrega }}</span>
    </div>

    <template v-else-if="preview">
      <h1 class="text-3xl font-semibold">T’han convidat</h1>
      <p class="mt-2 text-base-content/80">
        Crea el compte de coordinador a {{ preview.entity_name }} amb l’email {{ preview.email }}.
      </p>

      <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
        <span>{{ errorGlobal }}</span>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="enviar">
        <fieldset class="fieldset">
          <label class="label" for="name">El teu nom</label>
          <input
            id="name"
            v-model="camps.name"
            class="input w-full min-h-11"
            name="name"
            autocomplete="name"
            required
            :aria-invalid="Boolean(errorsCamp.name) || undefined"
            :aria-describedby="errorsCamp.name ? 'name-error' : undefined"
          />
          <p v-if="errorsCamp.name" id="name-error" class="text-error" role="alert">{{ errorsCamp.name }}</p>
        </fieldset>
        <fieldset class="fieldset">
          <label class="label" for="password">Contrasenya</label>
          <input
            id="password"
            v-model="camps.password"
            class="input w-full min-h-11"
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            :aria-invalid="Boolean(errorsCamp.password) || undefined"
            :aria-describedby="errorsCamp.password ? 'password-error' : undefined"
          />
          <p v-if="errorsCamp.password" id="password-error" class="text-error" role="alert">{{ errorsCamp.password }}</p>
        </fieldset>
        <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
          {{ enviant ? "Acceptant…" : "Acceptar i entrar" }}
        </button>
      </form>
    </template>
  </main>
</template>
