<template>
  <v-card>
    <v-card-title>
      <span class="headline">{{ isCreate ? 'Create New Metabook' : 'Edit Metabook' }}</span>
    </v-card-title>

    <v-card-text>
      <v-form ref="form" v-model="valid" lazy-validation>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                :label="$t('metabook.name')"
                :rules="[validateRequired]"
                required
                outlined
                dense
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                :label="$t('metabook.description')"
                outlined
                dense
                rows="2"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.format"
                :items="formatOptions"
                :label="$t('metabook.format')"
                :rules="[v => !!v || 'Format is required']"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-tabs v-model="tab">
                <v-tab>Books</v-tab>
                <v-tab>Series</v-tab>
                <v-tab>Collections</v-tab>
                <v-tab>Tags</v-tab>
                <v-tab>Options</v-tab>
              </v-tabs>

              <v-tabs-items v-model="tab">
                <!-- Books Tab -->
                <v-tab-item>
                  <v-card flat>
                    <v-card-text>
                      <book-selector v-model="formData.bookIds" />
                    </v-card-text>
                  </v-card>
                </v-tab-item>

                <!-- Series Tab -->
                <v-tab-item>
                  <v-card flat>
                    <v-card-text>
                      <series-selector v-model="formData.seriesIds" />
                    </v-card-text>
                  </v-card>
                </v-tab-item>

                <!-- Collections Tab -->
                <v-tab-item>
                  <v-card flat>
                    <v-card-text>
                      <collection-selector v-model="formData.collectionIds" />
                    </v-card-text>
                  </v-card>
                </v-tab-item>

                <!-- Tags Tab -->
                <v-tab-item>
                  <v-card flat>
                    <v-card-text>
                      <v-combobox
                        v-model="formData.tags"
                        :label="$t('metabook.tags')"
                        multiple
                        chips
                        deletable-chips
                        :hint="$t('metabook.tags_hint')"
                        persistent-hint
                      />
                    </v-card-text>
                  </v-card>
                </v-tab-item>

                <!-- Options Tab -->
                <v-tab-item>
                  <v-card flat>
                    <v-card-text>
                      <v-switch
                        :input-value="formData.options?.includeCovers ?? true"
                        :label="$t('metabook.include_covers')"
                        hide-details
                        @change="updateOption('includeCovers', $event)"
                      />
                      <v-switch
                        :input-value="formData.options?.includeMetadata ?? true"
                        :label="$t('metabook.include_metadata')"
                        hide-details
                        @change="updateOption('includeMetadata', $event)"
                      />
                      <v-switch
                        :input-value="formData.options?.tableOfContents ?? true"
                        :label="$t('metabook.table_of_contents')"
                        hide-details
                        @change="updateOption('tableOfContents', $event)"
                      />
                      <v-textarea
                        :value="formData.options?.customCss || ''"
                        :label="$t('metabook.custom_css')"
                        outlined
                        dense
                        rows="3"
                        :hint="$t('metabook.custom_css_hint')"
                        persistent-hint
                        @input="updateOption('customCss', $event)"
                      />
                    </v-card-text>
                  </v-card>
                </v-tab-item>
              </v-tabs-items>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn text @click="closeDialog">
        {{ $t('common.cancel') }}
      </v-btn>
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="save"
      >
        {{ isCreate ? $t('common.create') : $t('common.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { MetaBook, MetaBookCreate, MetaBookFormat } from '@/types/metabook';
import { MetaBookService } from '@/services/metaBookService';

export default defineComponent({
  name: 'MetaBookEditDialog',
  
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    metabook: {
      type: Object as () => MetaBook | null,
      default: null,
    },
  },

  emits: ['input', 'saved', 'close'],

  data() {
    return {
      loading: false,
      tab: 0,
      valid: false,
      formData: {
        name: '',
        description: '',
        format: 'EPUB' as MetaBookFormat,
        bookIds: [] as string[],
        seriesIds: [] as string[],
        collectionIds: [] as string[],
        readListIds: [] as string[],
        tags: [] as string[],
        options: {
          includeCovers: true,
          includeMetadata: true,
          tableOfContents: true,
          customCss: '',
        },
      } as MetaBookCreate,
    };
  },

  computed: {
    formatOptions() {
      return [
        { text: 'EPUB', value: 'EPUB' as MetaBookFormat },
        { text: 'PDF', value: 'PDF' as MetaBookFormat },
        { text: 'Markdown', value: 'MARKDOWN' as MetaBookFormat },
        { text: 'Web', value: 'WEB' as MetaBookFormat },
      ];
    },

    isCreate() {
      return !this.metabook;
    },

    dialog: {
      get(): boolean {
        return this.value;
      },
      set(value: boolean) {
        this.$emit('input', value);
      },
    },
  },

  watch: {
    dialog: {
      immediate: true,
      handler(newVal: boolean) {
        if (newVal) {
          this.initializeForm();
        }
      },
    },
  },

  created() {
    if (this.metabook) {
      this.initializeForm();
    }
  },

  methods: {
    initializeForm() {
      if (this.metabook) {
        this.formData = {
          name: this.metabook.name,
          description: this.metabook.description || '',
          format: this.metabook.format,
          bookIds: this.metabook.books?.map(book => book.id) || [],
          seriesIds: this.metabook.series?.map(series => series.id) || [],
          collectionIds: this.metabook.collections || [],
          readListIds: this.metabook.readListIds || [],
          tags: this.metabook.tags || [],
          options: {
            includeCovers: this.metabook.options?.includeCovers ?? true,
            includeMetadata: this.metabook.options?.includeMetadata ?? true,
            tableOfContents: this.metabook.options?.tableOfContents ?? true,
            customCss: this.metabook.options?.customCss || '',
          },
        };
      } else {
        this.resetForm();
      }
    },

    resetForm() {
      this.formData = {
        name: '',
        description: '',
        format: 'EPUB',
        bookIds: [],
        seriesIds: [],
        collectionIds: [],
        readListIds: [],
        tags: [],
        options: {
          includeCovers: true,
          includeMetadata: true,
          tableOfContents: true,
          customCss: '',
        },
      } as MetaBookCreate;
    },

    updateOption(key: string, value: any) {
      this.formData = {
        ...this.formData,
        options: {
          ...(this.formData.options || {
            includeCovers: true,
            includeMetadata: true,
            tableOfContents: true,
            customCss: '',
          }),
          [key]: value,
        },
      };
    },

    validateRequired(value: string): boolean | string {
      return !!value || this.$t('common.required_field');
    },

    closeDialog() {
      this.dialog = false;
      this.$emit('close');
    },

    async save() {
      const form = this.$refs.form as { validate: () => boolean };
      if (!form) {
        console.error('Form reference not found');
        return;
      }

      const isValid = form.validate();
      if (!isValid) {
        console.warn('Form validation failed');
        return;
      }


      this.loading = true;
      try {
        if (this.isCreate) {
          await MetaBookService.create(this.formData);
        } else if (this.metabook) {
          await MetaBookService.update(this.metabook.id, this.formData);
        }
        this.$emit('saved');
        this.dialog = false;
      } catch (error) {
        console.error('Failed to save metabook:', error);
        const action = this.isCreate ? 'create' : 'update';
        this.$toast.error(this.$t(`metabook.save_error_${action}`));
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
