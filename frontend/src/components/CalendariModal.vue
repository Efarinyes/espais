<script setup lang="ts">
import { etiquetaDurada } from "../calendari";
import type { ModalCalendari } from "../composables/useCalendariReserves";

defineProps<{
  modal: ModalCalendari;
  resumPendent: string;
  resumDetall: string;
  duradaMinuts: number;
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
}>();

const emit = defineEmits<{
  tancar: [];
  triarDurada: [minuts: number];
  confirmar: [];
  desar: [];
  "update:campAssistencia": [valor: string];
  demanarAnulacio: [];
  tornarDetall: [];
  confirmarAnulacio: [];
}>();

function actualitzarAssistencia(event: Event) {
  const camp = event.target as HTMLInputElement;
  emit("update:campAssistencia", camp.value);
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
      v-else-if="modal.tipus === 'detall' && modal.reserva.mine"
      class="modal-box"
      aria-labelledby="detall-titol"
      @submit.prevent="emit('desar')"
    >
      <h2 id="detall-titol" class="font-semibold text-lg">Reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="potReprogramar" class="text-sm text-base-content/80">
        Arrossega la reserva al calendari per canviar l’horari.
      </p>
      <label class="label" for="assistencia">Assistència</label>
      <input
        id="assistencia"
        class="input input-bordered w-full min-h-11"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        name="assistencia"
        autocomplete="off"
        :value="campAssistencia"
        @input="actualitzarAssistencia"
      />
      <p v-if="errorDetall" class="mt-2 text-error">{{ errorDetall }}</p>
      <p v-else-if="okDetall" class="mt-2 text-success">{{ okDetall }}</p>
      <p v-if="avisAforament" class="mt-2 text-sm">{{ avisAforament }}</p>
      <div class="modal-action flex-wrap gap-2">
        <button class="btn btn-ghost min-h-11" type="button" :disabled="enviantAssistencia" @click="emit('tancar')">
          Tanca
        </button>
        <button class="btn btn-primary min-h-11" type="submit" :disabled="enviantAssistencia">
          {{ enviantAssistencia ? "Desant…" : "Desa l’assistència" }}
        </button>
      </div>
    </form>

    <div v-else-if="modal.tipus === 'confirmar-anulacio'" class="modal-box" role="document" aria-labelledby="anula-titol">
      <h2 id="anula-titol" class="font-semibold text-lg">Anul·lar la reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name" class="text-base-content/80">{{ modal.reserva.coordinator_name }}</p>
      <p class="mt-4">S’avisarà el coordinador per in-app i correu.</p>
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
          {{ enviantAnulacio ? "Anul·lant…" : "Anul·la i avisa" }}
        </button>
      </div>
    </div>

    <div v-else-if="modal.tipus === 'detall'" class="modal-box" role="document" aria-labelledby="detall-titol">
      <h2 id="detall-titol" class="font-semibold text-lg">Reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name" class="text-base-content/80">{{ modal.reserva.coordinator_name }}</p>
      <p class="mt-2">
        Assistència:
        {{ modal.reserva.attendance_count == null ? "encara no registrada" : modal.reserva.attendance_count }}
      </p>
      <p v-if="potReprogramar" class="mt-2 text-sm text-base-content/80">
        Arrossega la reserva al calendari per canviar l’horari.
        <template v-if="reprogramacioAmbAvis"> S’avisarà el coordinador.</template>
      </p>
      <p v-if="avisAforament" class="mt-2 text-sm">{{ avisAforament }}</p>
      <p v-if="errorDetall" class="mt-2 text-error">{{ errorDetall }}</p>
      <div class="modal-action flex-wrap gap-2">
        <button class="btn btn-ghost min-h-11" type="button" @click="emit('tancar')">Tanca</button>
        <button v-if="potAnular" class="btn btn-error min-h-11" type="button" @click="emit('demanarAnulacio')">
          Anul·la
        </button>
      </div>
    </div>
  </dialog>
</template>
