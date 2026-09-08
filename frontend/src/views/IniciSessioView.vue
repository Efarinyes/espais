<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useIniciSessio } from "../composables/useIniciSessio";

const { camps, errorsCamp, errorGlobal, enviant, enviar } = useIniciSessio();
</script>

<template>
  <main class="pantalla">
    <h1>Inicia sessió</h1>
    <p>Entra amb l’email i la contrasenya del responsable.</p>

    <p v-if="errorGlobal" class="error-global" role="alert">{{ errorGlobal }}</p>

    <form class="formulari" @submit.prevent="enviar">
      <div class="camp">
        <label for="email">Email</label>
        <input id="email" v-model="camps.email" name="email" type="email" autocomplete="username" required />
        <p v-if="errorsCamp.email" class="camp__error">{{ errorsCamp.email }}</p>
      </div>

      <div class="camp">
        <label for="password">Contrasenya</label>
        <input
          id="password"
          v-model="camps.password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
        <p v-if="errorsCamp.password" class="camp__error">{{ errorsCamp.password }}</p>
      </div>

      <div class="accions">
        <button class="boto boto--primari" type="submit" :disabled="enviant">
          {{ enviant ? "Entrant…" : "Entrar" }}
        </button>
      </div>
    </form>

    <p class="enllacos">
      <RouterLink to="/registre">Registra una entitat nova</RouterLink>
    </p>
  </main>
</template>
