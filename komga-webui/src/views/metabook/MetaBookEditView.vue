<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center mb-4">
      <v-btn icon @click="$router.go(-1)" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h1 class="text-h4">{{ isEdit ? 'Edit Metabook' : 'Create New Metabook' }}</h1>
    </div>

    <v-card v-if="loading">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circ>
        <div class="mt-4">Loading metabook data...</div>
      </v-card-text>
    </v-card>

    <metabook-edit-dialog
      v-else
      :is-create="!isEdit"
      :metabook="metabook"
      @close="onClose"
      @saved="onSaved"
    />
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { MetaBook } from '@/types/metabook'
import { MetaBookService } from '@/services/metabook.service'
import MetaBookEditDialog from '@/components/metabook/MetaBookEditDialog.vue'

@Component({
  components: {
    MetaBookEditDialog
  },
  metaInfo() {
    return {
      title: this.isEdit ? 'Edit Metabook' : 'Create New Metabook'
    }
  }
})
export default class MetaBookEditView extends Vue {
  private loading = false
  private metabook: MetaBook | null = null

  private get isEdit(): boolean {
    return !!this.$route.params.id
  }

  private get id(): string | undefined {
    return this.$route.params.id
  }

  private async created() {
    if (this.isEdit && this.id) {
      await this.loadMetaBook()
    }
  }

  private async loadMetaBook() {
    if (!this.id) return

    try {
      this.loading = true
      const response = await MetaBookService.getById(this.id)
      this.metabook = response.data.data
    } catch (error) {
      this.$toast.error('Failed to load metabook')
      console.error(error)
      this.$router.push('/metabooks')
    } finally {
      this.loading = false
    }
  }

  private onClose() {
    this.$router.go(-1)
  }

  private onSaved() {
    this.$router.push('/metabooks')
  }
}
</script>
