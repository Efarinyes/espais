<script setup lang="ts">
import { etiquetaDurada } from "../calendari";
import type { ModalCalendari } from "../composables/useCalendariReserves";

defineProps<{
  modal: ModalCalendari;
  resumPendent: string;
  resumDetall: string;
  duradaMinuts: number;
  duradaDetall: number;
  durades: readonly number[];
  enviant: boolean;
  campAssistencia: string;
  errorDetall: string;
  okDetall: string;
  avisAforament: string;
  enviantAssistencia: boolean;
  potAnular: boolean;
  enviantAnulacio: boolean;
  potReprogramar: boolean;
  reprogramacioAmbAvis: boolean;
  diaHorari: string;
  horaHorari: string;
  diesReservables: string;
  enviantReprogramacio: boolean;
  potRegistrarAssistencia: boolean;
}>();

const emit = defineEmits<{
  tancar: [];
  triarDurada: [minuts: number];
  confirmar: [];
  desar: [];
  "update:campAssistencia": [valor: string];
  "update:diaHorari": [valor: string];
  "update:horaHorari": [valor: string];
  canviarHorari: [];
  demanarAnulacio: [];
  tornarDetall: [];
  confirmarAnulacio: [];
}>();

function actualitzarAssistencia(event: Event) {
  const camp = event.target as HTMLInputElement;
  emit("update:campAssistencia", camp.value);
}

function valorDe(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
</script>

<template>
  <dialog class="modal modal-open" aria-modal="true">
    <form
      v-if="modal.tipus === 'crear'"
      class="modal-box"
      aria-labelledby="confirma-titol"
      @submit.prevent="emit('confirmar')"
    >
      <h2 id="confirma-titol" class="font-semibold text-lg">Confirmar reserva</h2>
      <p class="py-4">{{ resumPendent }}</p>
      <p class="font-medium">Durada</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="minuts in durades"
          :key="minuts"
          class="btn min-h-11"
          :class="duradaMinuts === minuts ? 'btn-primary' : 'btn-outline'"
          type="button"
          :disabled="enviant"
          @click="emit('triarDurada', minuts)"
        >
          {{ etiquetaDurada(minuts) }}
        </button>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost min-h-11" type="button" :disabled="enviant" @click="emit('tancar')">
          Cancel·la
        </button>
        <button class="btn btn-primary min-h-11" type="submit" :disabled="enviant">
          {{ enviant ? "Reservant…" : "Confirma" }}
        </button>
      </div>
    </form>

    <form
      v-else-if="modal.tipus === 'detall'"
      class="modal-box"
      aria-labelledby="detall-titol"
      @submit.prevent="emit('desar')"
    >
      <h2 id="detall-titol" class="font-semibold text-lg">Reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name && !modal.reserva.mine" class="text-base-content/80">
        {{ modal.reserva.coordinator_name }}
      </p>
      <p v-if="potReprogramar" class="text-sm text-base-content/80">
        Arrossega la reserva al calendari per canviar l’horari, o tria el dia i l’hora aquí.
        <template v-if="reprogramacioAmbAvis"> S’avisarà el coordinador.</template>
      </p>
      <div v-if="potReprogramar" class="mt-4 grid gap-3">
        <div>
          <label class="label" for="dia-reserva">Dia</label>
          <input
            id="dia-reserva"
            class="input w-full min-h-11 border border-base-300 bg-base-100"
            type="date"
            name="dia"
            :value="diaHorari"
            @input="emit('update:diaHorari', valorDe($event))"
          />
          <p v-if="diesReservables" class="mt-1 text-sm text-base-content/80">
            Dies en què es pot reservar: {{ diesReservables }}.
          </p>
        </div>
        <div>
          <label class="label" for="hora-reserva">Hora</label>
          <input
            id="hora-reserva"
            class="input w-full min-h-11 border border-base-300 bg-base-100"
            type="time"
            name="hora"
            :value="horaHorari"
            @input="emit('update:horaHorari', valorDe($event))"
          />
          <p class="mt-1 text-sm text-base-content/80">Durada: {{ etiquetaDurada(duradaDetall) }}</p>
        </div>
        <button
          class="btn btn-outline min-h-11"
          type="button"
          :disabled="enviantReprogramacio"
          @click="emit('canviarHorari')"
        >
          {{ enviantReprogramacio ? "Canviant…" : "Canvia l’horari" }}
        </button>
      </div>
      <template v-if="potRegistrarAssistencia">
        <label class="label mt-4" for="assistencia">Nombre d’assistents</label>
        <input
          id="assistencia"
          class="input w-full min-h-11 border border-base-300 bg-base-100"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          name="assistencia"
          autocomplete="off"
          placeholder="12"
          :value="campAssistencia"
          :aria-invalid="Boolean(errorDetall) || undefined"
          :aria-describedby="errorDetall ? 'assistencia-error' : undefined"
          @input="actualitzarAssistencia"
        />
      </template>
      <p v-if="errorDetall" id="assistencia-error" class="mt-2 text-error" role="alert">{{ errorDetall }}</p>
      <p v-else-if="okDetall" class="mt-2 text-success">{{ okDetall }}</p>
      <p v-if="avisAforament" class="mt-2 text-sm">{{ avisAforament }}</p>
      <div class="modal-action flex-wrap gap-2">
        <button class="btn btn-ghost min-h-11" type="button" :disabled="enviantAssistencia" @click="emit('tancar')">
          Tanca
        </button>
        <button
          v-if="potRegistrarAssistencia"
          class="btn btn-primary min-h-11"
          type="submit"
          :disabled="enviantAssistencia"
        >
          {{ enviantAssistencia ? "Desant…" : "Desa el nombre" }}
        </button>
        <button
          v-if="potAnular"
          class="btn btn-error min-h-11"
          type="button"
          @click="emit('demanarAnulacio')"
        >
          Anul·la
        </button>
      </div>
    </form>

    <div v-else-if="modal.tipus === 'confirmar-anulacio'" class="modal-box" role="document" aria-labelledby="anula-titol">
      <h2 id="anula-titol" class="font-semibold text-lg">Anul·lar la reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name" class="text-base-content/80">{{ modal.reserva.coordinator_name }}</p>
      <p v-if="reprogramacioAmbAvis" class="mt-4">S’avisarà el coordinador per in-app i correu.</p>
      <p v-if="errorDetall" class="mt-2 text-error">{{ errorDetall }}</p>
      <div class="modal-action flex-wrap gap-2">
        <button class="btn btn-ghost min-h-11" type="button" :disabled="enviantAnulacio" @click="emit('tornarDetall')">
          Enrere
        </button>
        <button
          class="btn btn-error min-h-11"
          type="button"
          :disabled="enviantAnulacio"
          @click="emit('confirmarAnulacio')"
        >
          {{ enviantAnulacio ? "Anul·lant…" : reprogramacioAmbAvis ? "Anul·la i avisa" : "Anul·la" }}
        </button>
      </div>
    </div>

  </dialog>
</template>
