<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useRegistre } from "../composables/useRegistre";

const { camps, errorsCamp, errorGlobal, enviant, enviar } = useRegistre();
</script>

<template>
  <main class="pantalla">
    <h1>Registra l’entitat</h1>
    <p>Un sol pas: dades de l’entitat i del primer responsable. Sense cobrament.</p>

    <p v-if="errorGlobal" class="error-global" role="alert">{{ errorGlobal }}</p>

    <form class="formulari" @submit.prevent="enviar">
      <div class="camp">
        <label for="entity_name">Nom de l’entitat</label>
        <input
          id="entity_name"
          v-model="camps.entity_name"
          name="entity_name"
          autocomplete="organization"
          required
        />
        <p v-if="errorsCamp.entity_name" class="camp__error">{{ errorsCamp.entity_name }}</p>
      </div>

      <div class="camp">
        <label for="typology">Tipologia (opcional)</label>
        <input
          id="typology"
          v-model="camps.typology"
          name="typology"
          placeholder="associació de veïns, biblioteca…"
        />
      </div>

      <div class="camp">
        <label for="responsible_name">Nom del responsable</label>
        <input
          id="responsible_name"
          v-model="camps.responsible_name"
          name="responsible_name"
          autocomplete="name"
          required
        />
        <p v-if="errorsCamp.responsible_name" class="camp__error">{{ errorsCamp.responsible_name }}</p>
      </div>

      <div class="camp">
        <label for="email">Email</label>
        <input id="email" v-model="camps.email" name="email" type="email" autocomplete="email" required />
        <p v-if="errorsCamp.email" class="camp__error">{{ errorsCamp.email }}</p>
      </div>

      <div class="camp">
        <label for="password">Contrasenya</label>
        <input
          id="password"
          v-model="camps.password"
          name="password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
        <p v-if="errorsCamp.password" class="camp__error">{{ errorsCamp.password }}</p>
      </div>

      <div class="accions">
        <button class="boto boto--primari" type="submit" :disabled="enviant">
          {{ enviant ? "Registrant…" : "Registrar l’entitat" }}
        </button>
      </div>
    </form>

    <p class="enllacos">
      <RouterLink to="/iniciar-sessio">Ja tens compte? Inicia sessió</RouterLink>
    </p>
  </main>
</template>
