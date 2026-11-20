<script setup lang="ts">
/**
 * Camp opcional «Persones previstes»: quantes persones preveu el coordinador o el responsable que
 * participaran. És planificació; Espais no registra ni verifica l'assistència real.
 */
defineProps<{
  modelValue: string;
  disabled?: boolean;
  /** Id del missatge d'error de la fitxa, si n'hi ha, per enllaçar-lo al camp. */
  errorId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [valor: string];
}>();

function alternar(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="mt-4" data-persones-previstes>
    <label class="label" for="persones-previstes">Persones previstes (opcional)</label>
    <input
      id="persones-previstes"
      class="input w-full min-h-11 border border-base-300 bg-base-100"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      name="persones-previstes"
      autocomplete="off"
      placeholder="12"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="errorId ? true : undefined"
      :aria-describedby="errorId ? `persones-previstes-ajuda ${errorId}` : 'persones-previstes-ajuda'"
      @input="alternar"
    />
    <p id="persones-previstes-ajuda" class="mt-1 text-sm text-base-content/80">
      Orientatiu: quantes persones preveus que participaran.
    </p>
  </div>
</template>
