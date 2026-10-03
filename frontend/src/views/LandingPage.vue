<script setup lang="ts">
import { useHeroFons } from "../composables/useHeroFons";

const { heros, index, pausat, reduccio, togglePausa } = useHeroFons();

const passes = [
  {
    titol: "Defineix els espais",
    text: "El responsable posa nom, aforament i els dies que es pot reservar. Cada entitat anomena les sales com vulgui.",
    imatge: "/landing/espais.png",
    alt: "Llista d’espais de l’entitat a Espais",
  },
  {
    titol: "Reserva al calendari",
    text: "El coordinador reserva des del telèfon o l’ordinador. L’app evita solapaments i respecta l’aforament.",
    imatge: "/landing/calendari.png",
    alt: "Calendari de reserves a Espais",
  },
  {
    titol: "Governa i avisa",
    text: "Si el responsable reprograma o anul·la, el coordinador ho veu a l’acte i pot avisar els participants.",
    imatge: "/landing/avisos.png",
    alt: "Safata d’avisos del coordinador a Espais",
  },
  {
    titol: "Mira l’ús de cada espai",
    text: "El responsable veu ocupació, reserves i assistència per sala. Serveix per saber si un espai es fa servir o queda buit.",
    imatge: "",
    alt: "",
  },
] as const;
</script>

<template>
  <main class="w-full">
    <section
      class="landing-hero relative flex overflow-hidden md:min-h-[85vh] md:items-center"
      aria-labelledby="hero-titol"
    >
      <div class="absolute inset-0" aria-hidden="true">
        <img
          v-for="(foto, i) in heros"
          :key="foto.clau"
          class="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          :class="i === index ? 'opacity-100' : 'opacity-0'"
          :src="foto.src"
          alt=""
          :width="foto.width"
          :height="foto.height"
        />
      </div>
      <div class="absolute inset-0 bg-[#202A2E]/75" aria-hidden="true"></div>
      <div class="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-4 py-16 md:py-24">
        <h1 id="hero-titol" class="text-3xl font-semibold leading-tight text-white md:text-6xl">
          Qui té la sala, a quina hora, qui vindrà?
        </h1>
        <p class="mt-6 max-w-3xl text-lg leading-snug text-white md:text-2xl">
          Gestionar un col·lectiu és molt més que tenir un grup de xat. Amb Espais teniu una app
          interna per organitzar els vostres espais, consultar horaris i controlar
          l’aforament de manera fàcil i clara.
        </p>
        <button
          v-if="!reduccio"
          class="btn btn-ghost z-10 mt-8 min-h-11 self-start text-white"
          type="button"
          @click="togglePausa"
        >
          {{ pausat ? "Reprèn el fons" : "Atura el fons" }}
        </button>
      </div>
    </section>

    <section class="mx-auto w-full max-w-5xl px-4 py-16" aria-labelledby="com-funciona">
      <h2 id="com-funciona" class="text-3xl font-semibold md:text-4xl">Com funciona</h2>
      <p class="mt-3 max-w-2xl text-lg text-base-content/80">
        Tres gestos, i un cop d’ull a l’ús. El públic pot venir a l’acte; qui reserva és qui té rol a
        l’entitat.
      </p>
      <ul class="mt-10 space-y-14">
        <li
          v-for="(pas, i) in passes"
          :key="pas.titol"
          class="grid items-center gap-6 md:grid-cols-2 md:gap-10"
        >
          <div :class="i % 2 === 1 ? 'md:order-2' : ''">
            <h3 class="text-2xl font-semibold">{{ pas.titol }}</h3>
            <p class="mt-2 text-lg text-base-content/80">{{ pas.text }}</p>
          </div>
          <figure :class="i % 2 === 1 ? 'md:order-1' : ''">
            <img
              v-if="pas.imatge"
              class="h-72 w-full rounded-box border border-base-300 bg-base-100 object-cover object-top shadow-sm md:h-auto md:object-contain"
              :src="pas.imatge"
              :alt="pas.alt"
              width="960"
              height="640"
            />
            <div
              v-else
              class="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm"
              aria-hidden="true"
            >
              <p class="text-sm font-semibold">Sala gran</p>
              <div class="mt-2 h-3 w-full rounded bg-base-200">
                <div class="h-3 w-3/4 rounded bg-primary"></div>
              </div>
              <p class="mt-4 text-sm font-semibold">Sala d’assaig</p>
              <div class="mt-2 h-3 w-full rounded bg-base-200">
                <div class="h-3 w-1/2 rounded bg-secondary"></div>
              </div>
              <p class="mt-4 text-sm font-semibold">Taller</p>
              <div class="mt-2 h-3 w-full rounded bg-base-200">
                <div class="h-3 w-1/5 rounded bg-accent"></div>
              </div>
            </div>
          </figure>
        </li>
      </ul>
    </section>
  </main>
</template>
