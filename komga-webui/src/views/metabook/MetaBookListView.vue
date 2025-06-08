<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4" align="center">
      <v-col cols="12" md="6">
        <h1 class="text-h4">Metabooks</h1>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn color="primary" @click="createDialog = true">
          <v-icon left>mdi-plus</v-icon>
          Create New Metabook
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-card-title>
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          clearable
          class="mr-4"
        ></v-text-field>
        <v-spacer></v-spacer>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="metabooks"
        :search="search"
        :loading="loading"
        :items-per-page="20"
        class="elevation-1"
      >
        <template v-slot:item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" small>
            {{ item.status }}
          </v-chip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
                @click="viewMetabook(item)"
              >
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>View Details</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
                @click="editMetabook(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
                @click="confirmDelete(item)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
            <span>Delete</span>
          </v-tooltip>
        </template>
      </v-data-table>
    </v-card>


    <!-- Create Dialog -->
    <v-dialog v-model="createDialog" max-width="800px" persistent>
      <metabook-edit-dialog
        v-if="createDialog"
        :is-create="true"
        @close="createDialog = false"
        @saved="onMetabookCreated"
      />
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">Delete Metabook</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ selectedMetabook?.name }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" text @click="deleteMetabook">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { MetaBook } from '@/types/metabook'
import MetaBookEditDialog from '@/components/metabook/MetaBookEditDialog.vue'
import { MetaBookService } from '@/services/metabook.service'

@Component({
  components: {
    MetaBookEditDialog
  }
})
export default class MetaBookListView extends Vue {
  private loading = false
  private search = ''
  private createDialog = false
  private deleteDialog = false
  private selectedMetabook: MetaBook | null = null
  private metabooks: MetaBook[] = []

  private headers = [
    { text: 'Name', value: 'name' },
    { text: 'Format', value: 'format' },
    { text: 'Status', value: 'status' },
    { text: 'Created', value: 'createdDate' },
    { text: 'Last Modified', value: 'lastModifiedDate' },
    { text: 'Actions', value: 'actions', sortable: false, align: 'end' }
  ]

  private getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'PROCESSING':
        return 'info'
      case 'FAILED':
        return 'error'
      default:
        return 'grey'
    }
  }

  private async mounted() {
    await this.loadMetabooks()
  }

  private async loadMetabooks() {
    try {
      this.loading = true
      const response = await MetaBookService.getAll()
      this.metabooks = response.data.data
    } catch (error) {
      (this as any).$toast.error('Failed to load metabooks')
      console.error(error)
    } finally {
      this.loading = false
    }
  }

  private viewMetabook(metabook: MetaBook) {
    (this as any).$router.push(`/metabooks/${metabook.id}`)
  }

  private editMetabook(metabook: MetaBook) {
    (this as any).$router.push(`/metabooks/${metabook.id}/edit`)
  }

  private confirmDelete(metabook: MetaBook) {
    this.selectedMetabook = metabook
    this.deleteDialog = true
  }

  private async deleteMetabook() {
    if (!this.selectedMetabook) return

    try {
      await MetaBookService.delete(this.selectedMetabook.id)
      (this as any).$toast.success('Metabook deleted successfully')
      await this.loadMetabooks()
    } catch (error) {
      (this as any).$toast.error('Failed to delete metabook')
      console.error(error)
    } finally {
      this.deleteDialog = false
      this.selectedMetabook = null
    }
  }

  private onMetabookCreated() {
    this.createDialog = false
    this.loadMetabooks()
  }
}
</script>
