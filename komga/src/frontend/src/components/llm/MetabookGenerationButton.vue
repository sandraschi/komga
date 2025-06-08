<template>
  <div>
    <q-btn
      :label="label"
      :icon="icon"
      :color="color"
      :dense="dense"
      :outline="outline"
      :flat="flat"
      :round="round"
      :loading="loading"
      :disable="disabled"
      @click="openDialog"
      class="q-ml-sm"
    >
      <template v-slot:loading>
        <q-spinner class="on-left" />
        Generating...
      </template>
    </q-btn>

    <metabook-generation-dialog
      v-model="showDialog"
      :book-id="bookId"
      :available-models="availableModels"
      @applied="$emit('applied')"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import MetabookGenerationDialog from './MetabookGenerationDialog.vue'

export default defineComponent({
  name: 'MetabookGenerationButton',
  
  components: {
    MetabookGenerationDialog
  },
  
  props: {
    bookId: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: 'Generate Metadata'
    },
    icon: {
      type: String,
      default: 'auto_awesome'
    },
    color: {
      type: String,
      default: 'primary'
    },
    dense: {
      type: Boolean,
      default: false
    },
    outline: {
      type: Boolean,
      default: false
    },
    flat: {
      type: Boolean,
      default: false
    },
    round: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    availableModels: {
      type: Array as () => Array<{ label: string; value: string }>,
      default: () => []
    }
  },
  
  emits: ['applied'],
  
  setup() {
    const showDialog = ref(false)
    
    const openDialog = () => {
      showDialog.value = true
    }
    
    return {
      showDialog,
      openDialog
    }
  }
})
</script>
