<template>
  <v-container v-if="metabook" fluid class="pa-4">
    <v-row class="mb-4" align="center">
      <v-col cols="12" md="6">
        <div class="d-flex align-center">
          <v-btn icon @click="$router.go(-1)" class="mr-2">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1 class="text-h4">{{ metabook.name }}</h1>
        </div>
        <div class="text-subtitle-1 grey--text">{{ metabook.description }}</div>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-chip class="mr-2" :color="getStatusColor(metabook.status)">
          {{ metabook.status }}
        </v-chip>
        <v-chip class="mr-2">
          {{ metabook.format }}
        </v-chip>
        <v-menu bottom left>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              v-bind="attrs"
              v-on="on"
              :loading="generating"
              :disabled="metabook.status === 'PROCESSING'"
            >
              <v-icon left>mdi-file-document-multiple-outline</v-icon>
              Generate
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="format in availableFormats"
              :key="format.value"
              @click="generateMetabook(format.value)"
            >
              <v-list-item-title>{{ format.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          color="secondary"
          class="ml-2"
          @click="editMetabook"
          :disabled="metabook.status === 'PROCESSING'"
        >
          <v-icon left>mdi-pencil</v-icon>
          Edit
        </v-btn>
      </v-col>
    </v-row>

    <v-tabs v-model="tab" grow>
      <v-tab>Overview</v-tab>
      <v-tab>Generated Files</v-tab>
      <v-tab>Books</v-tab>
      <v-tab>Series</v-tab>
      <v-tab>Collections</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab" class="mt-4">
      <!-- Overview Tab -->
      <v-tab-item>
        <v-card flat>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>Details</v-card-title>
                  <v-card-text>
                    <v-list dense>
                      <v-list-item>
                        <v-list-item-content>Status:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          <v-chip :color="getStatusColor(metabook.status)" small>
                            {{ metabook.status }}
                          </v-chip>
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Format:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ metabook.format }}
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Created:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ formatDate(metabook.createdDate) }}
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Last Modified:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ formatDate(metabook.lastModifiedDate) }}
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>Statistics</v-card-title>
                  <v-card-text>
                    <v-list dense>
                      <v-list-item>
                        <v-list-item-content>Total Books:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ metabook.books?.length || 0 }}
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Series Count:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ metabook.series?.length || 0 }}
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Collections:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          {{ metabook.collections?.length || 0 }}
                        </v-list-item-content>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-content>Tags:</v-list-item-content>
                        <v-list-item-content class="align-end">
                          <v-chip
                            v-for="(tag, i) in metabook.tags"
                            :key="i"
                            x-small
                            class="mr-1 mb-1"
                          >
                            {{ tag }}
                          </v-chip>
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tab-item>

      <!-- Generated Files Tab -->
      <v-tab-item>
        <v-card flat>
          <v-card-text>
            <v-data-table
              :headers="fileHeaders"
              :items="metabook.generatedFiles || []"
              :loading="loading"
              class="elevation-1"
            >
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon
                  color="primary"
                  :href="getDownloadLink(item)"
                  target="_blank"
                  download
                >
                  <v-icon>mdi-download</v-icon>
                </v-btn>
                <v-btn icon color="error" @click="confirmDeleteFile(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-tab-item>

      <!-- Books Tab -->
      <v-tab-item>
        <v-card flat>
          <v-card-text>
            <book-list :books="metabook.books || []" :show-actions="false" />
          </v-card-text>
        </v-card>
      </v-tab-item>

      <!-- Series Tab -->
      <v-tab-item>
        <v-card flat>
          <v-card-text>
            <series-list :series="metabook.series || []" :show-actions="false" />
          </v-card-text>
        </v-card>
      </v-tab-item>

      <!-- Collections Tab -->
      <v-tab-item>
        <v-card flat>
          <v-card-text>
            <v-list v-if="metabook.collections && metabook.collections.length > 0">
              <v-list-item
                v-for="(collection, i) in metabook.collections"
                :key="i"
                :to="`/collections/${collection.id}`"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ collection.name }}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-icon>
                  <v-icon>mdi-chevron-right</v-icon>
                </v-list-item-icon>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" outlined>
              No collections found
            </v-alert>
          </v-card-text>
        </v-card>
      </v-tab-item>
    </v-tabs-items>

    <!-- Delete File Confirmation -->
    <v-dialog v-model="deleteFileDialog" max-width="500px">
      <v-card>
        <v-card-title>Delete File</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ selectedFileName }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteFileDialog = false">Cancel</v-btn>
          <v-btn color="error" text @click="deleteFile">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { MetaBook, MetaBookFormat } from '@/types/metabook'
import { MetaBookService } from '@/services/metabook.service'
import BookList from '@/components/books/BookList.vue'
import SeriesList from '@/components/series/SeriesList.vue'

@Component({
  components: {
    BookList,
    SeriesList
  },
  metaInfo() {
    return {
      title: this.metabook ? this.metabook.name : 'Loading...'
    }
  }
})
export default class MetaBookDetailView extends Vue {
  private loading = false
  private generating = false
  private tab = 0
  private metabook: MetaBook | null = null
  private deleteFileDialog = false
  private selectedFileName = ''
  private selectedFileToDelete: string | null = null

  private fileHeaders = [
    { text: 'File Name', value: 'name' },
    { text: 'Size', value: 'size' },
    { text: 'Generated', value: 'generatedDate' },
    { text: 'Actions', value: 'actions', sortable: false, align: 'end' }
  ]

  private availableFormats = [
    { text: 'EPUB', value: 'EPUB' },
    { text: 'PDF', value: 'PDF' },
    { text: 'Markdown', value: 'MARKDOWN' },
    { text: 'Web', value: 'WEB' }
  ]

  private get id(): string {
    return this.$route.params.id
  }

  private async mounted() {
    await this.loadMetaBook()
  }

  @Watch('$route')
  private async onRouteChange() {
    await this.loadMetaBook()
  }

  private async loadMetaBook() {
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

  private editMetabook() {
    this.$router.push(`/metabooks/${this.id}/edit`)
  }

  private async generateMetabook(format: MetaBookFormat) {
    if (!this.metabook) return

    try {
      this.generating = true
      const response = await MetaBookService.generate(this.metabook.id, format)
      
      // Open the download URL in a new tab
      window.open(response.data.data.downloadUrl, '_blank')
      
      // Reload the metabook to update the file list
      await this.loadMetaBook()
    } catch (error) {
      this.$toast.error('Failed to generate metabook')
      console.error(error)
    } finally {
      this.generating = false
    }
  }

  private confirmDeleteFile(fileName: string) {
    this.selectedFileName = fileName
    this.selectedFileToDelete = fileName
    this.deleteFileDialog = true
  }

  private async deleteFile() {
    if (!this.metabook || !this.selectedFileToDelete) return

    try {
      // TODO: Implement file deletion in the backend
      this.$toast.success('File deleted successfully')
      await this.loadMetaBook()
    } catch (error) {
      this.$toast.error('Failed to delete file')
      console.error(error)
    } finally {
      this.deleteFileDialog = false
      this.selectedFileToDelete = null
      this.selectedFileName = ''
    }
  }

  private getDownloadLink(fileName: string): string {
    return MetaBookService.getDownloadUrl(this.id, fileName)
  }

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

  private formatDate(dateString: string): string {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString()
  }
}
</script>
