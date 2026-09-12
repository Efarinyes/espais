<script setup lang="ts">
import type { DiaHorari } from "../disponibilitat";

const dies = defineModel<DiaHorari[]>({ required: true });

function actualitza(weekday: number, canvi: Partial<Pick<DiaHorari, "actiu" | "start" | "end">>) {
  dies.value = dies.value.map((dia) => (dia.weekday === weekday ? { ...dia, ...canvi } : dia));
}

function marcaActiu(weekday: number, event: Event) {
  const desti = event.target;
  if (!(desti instanceof HTMLInputElement)) {
    return;
  }
  actualitza(weekday, { actiu: desti.checked });
}

function marcaHora(weekday: number, camp: "start" | "end", event: Event) {
  const desti = event.target;
  if (!(desti instanceof HTMLInputElement)) {
    return;
  }
  actualitza(weekday, { [camp]: desti.value });
}
</script>

<template>
  <div>
    <h2 class="text-base font-semibold">Disponibilitat</h2>
    <p class="mt-1 text-sm text-base-content/70">Dies i horari en què es pot reservar. Fus Europe/Madrid.</p>
    <ul class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-7 md:gap-2">
      <li
        v-for="dia in dies"
        :key="dia.weekday"
        class="rounded-box border border-base-300 bg-base-100 p-3 md:p-2"
      >
        <label class="flex cursor-pointer items-center gap-3 min-h-11 md:flex-col md:items-start md:gap-1">
          <input
            class="checkbox"
            type="checkbox"
            :checked="dia.actiu"
            @change="marcaActiu(dia.weekday, $event)"
          />
          <span class="font-medium">{{ dia.etiqueta }}</span>
        </label>
        <div v-if="dia.actiu" class="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
          <div>
            <label class="text-sm" :for="`inici-${dia.weekday}`">Inici</label>
            <input
              :id="`inici-${dia.weekday}`"
              class="input w-full min-h-11"
              type="time"
              :value="dia.start"
              @change="marcaHora(dia.weekday, 'start', $event)"
            />
          </div>
          <div>
            <label class="text-sm" :for="`fi-${dia.weekday}`">Fi</label>
            <input
              :id="`fi-${dia.weekday}`"
              class="input w-full min-h-11"
              type="time"
              :value="dia.end"
              @change="marcaHora(dia.weekday, 'end', $event)"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
