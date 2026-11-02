<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { etiquetaDurada } from "../calendari";
import type { ModalCalendari } from "../composables/useCalendariReserves";

const props = defineProps<{
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

const dialeg = ref<HTMLDialogElement | null>(null);
const botoEnrere = ref<HTMLButtonElement | null>(null);
const idTitol = computed(() => {
  if (props.modal.tipus === "crear") {
    return "confirma-titol";
  }
  if (props.modal.tipus === "detall") {
    return "detall-titol";
  }
  return "anula-titol";
});
let origen: HTMLElement | null = null;

function ocupat(): boolean {
  return props.enviant || props.enviantAnulacio || props.enviantAssistencia || props.enviantReprogramacio;
}

function onCancel(event: Event) {
  if (ocupat()) {
    event.preventDefault();
    return;
  }
  emit("tancar");
}

function onClose() {
  if (ocupat()) {
    dialeg.value?.showModal();
    return;
  }
  emit("tancar");
}

onMounted(() => {
  origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const el = dialeg.value;
  if (!el) {
    return;
  }
  el.addEventListener("cancel", onCancel);
  el.addEventListener("close", onClose);
  if (!el.open && typeof el.showModal === "function") {
    try {
      el.showModal();
    } catch {
      el.open = true;
    }
  }
  if (!el.open) {
    el.open = true;
  }
  if (props.modal.tipus === "confirmar-anulacio") {
    botoEnrere.value?.focus();
    return;
  }
  el.querySelector<HTMLElement>("h2")?.focus();
});

onUnmounted(() => {
  dialeg.value?.removeEventListener("cancel", onCancel);
  dialeg.value?.removeEventListener("close", onClose);
  if (origen && document.contains(origen)) {
    origen.focus();
  }
});
</script>

<template>
  <dialog ref="dialeg" class="modal modal-open" :aria-labelledby="idTitol">
    <form
      v-if="modal.tipus === 'crear'"
      class="modal-box"
      @submit.prevent="emit('confirmar')"
    >
      <h2 id="confirma-titol" class="font-semibold text-lg" tabindex="-1">Confirmar reserva</h2>
      <p class="py-4">{{ resumPendent }}</p>
      <p v-if="errorDetall" class="text-error" role="alert">{{ errorDetall }}</p>
      <p class="font-medium">Durada</p>
      <div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Durada">
        <button
          v-for="minuts in durades"
          :key="minuts"
          class="btn min-h-11"
          :class="duradaMinuts === minuts ? 'btn-primary' : 'btn-outline'"
          type="button"
          :disabled="enviant"
          :aria-pressed="duradaMinuts === minuts"
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
      @submit.prevent="emit('desar')"
    >
      <h2 id="detall-titol" class="font-semibold text-lg" tabindex="-1">Reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name && !modal.reserva.mine" class="text-base-content/80">
        {{ modal.reserva.coordinator_name }}
      </p>
      <p v-if="potReprogramar" class="text-sm text-base-content/80">
        Arrossega la reserva al calendari per canviar l’horari, o tria el dia i l’hora aquí.
        <template v-if="reprogramacioAmbAvis"> S’avisarà el coordinador.</template>
      </p>
      <section v-if="potReprogramar" class="mt-4 grid gap-3" aria-labelledby="horari-reserva">
        <h3 id="horari-reserva" class="font-medium">Horari</h3>
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
      </section>
      <section v-if="potRegistrarAssistencia" aria-labelledby="assistencia-reserva">
        <h3 id="assistencia-reserva" class="font-medium">Assistència</h3>
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
      </section>
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

    <div v-else-if="modal.tipus === 'confirmar-anulacio'" class="modal-box">
      <h2 id="anula-titol" class="font-semibold text-lg" tabindex="-1">Anul·lar la reserva</h2>
      <p class="py-2">{{ resumDetall }}</p>
      <p v-if="modal.reserva.coordinator_name" class="text-base-content/80">{{ modal.reserva.coordinator_name }}</p>
      <p v-if="reprogramacioAmbAvis" class="mt-4">S’avisarà el coordinador per in-app i correu.</p>
      <p v-if="errorDetall" class="mt-2 text-error">{{ errorDetall }}</p>
      <div class="modal-action flex-wrap gap-2">
        <button
          ref="botoEnrere"
          class="btn btn-ghost min-h-11"
          type="button"
          :disabled="enviantAnulacio"
          @click="emit('tornarDetall')"
        >
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
