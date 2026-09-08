<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useRegistre } from "../composables/useRegistre";

const { camps, errorsCamp, errorGlobal, enviant, enviar } = useRegistre();
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="text-3xl font-semibold">Registra l’entitat</h1>
    <p class="mt-2 text-base-content/80">Un sol pas: dades de l’entitat i del primer responsable. Sense cobrament.</p>

    <div v-if="errorGlobal" class="alert alert-error mt-6" role="alert">
      <span>{{ errorGlobal }}</span>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="enviar">
      <fieldset class="fieldset">
        <label class="label" for="entity_name">Nom de l’entitat</label>
        <input
          id="entity_name"
          v-model="camps.entity_name"
          class="input w-full min-h-11"
          name="entity_name"
          autocomplete="organization"
          required
        />
        <p v-if="errorsCamp.entity_name" class="text-error">{{ errorsCamp.entity_name }}</p>
      </fieldset>

      <fieldset class="fieldset">
        <label class="label" for="typology">Tipologia (opcional)</label>
        <input
          id="typology"
          v-model="camps.typology"
          class="input w-full min-h-11"
          name="typology"
          placeholder="associació de veïns, biblioteca…"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label class="label" for="responsible_name">Nom del responsable</label>
        <input
          id="responsible_name"
          v-model="camps.responsible_name"
          class="input w-full min-h-11"
          name="responsible_name"
          autocomplete="name"
          required
        />
        <p v-if="errorsCamp.responsible_name" class="text-error">{{ errorsCamp.responsible_name }}</p>
      </fieldset>

      <fieldset class="fieldset">
        <label class="label" for="email">Email</label>
        <input
          id="email"
          v-model="camps.email"
          class="input w-full min-h-11"
          name="email"
          type="email"
          autocomplete="email"
          required
        />
        <p v-if="errorsCamp.email" class="text-error">{{ errorsCamp.email }}</p>
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
        />
        <p v-if="errorsCamp.password" class="text-error">{{ errorsCamp.password }}</p>
      </fieldset>

      <button class="btn btn-primary min-h-11 w-full" type="submit" :disabled="enviant">
        {{ enviant ? "Registrant…" : "Registrar l’entitat" }}
      </button>
    </form>

    <p class="mt-6">
      <RouterLink class="link link-primary" to="/iniciar-sessio">Ja tens compte? Inicia sessió</RouterLink>
    </p>
  </main>
</template>
