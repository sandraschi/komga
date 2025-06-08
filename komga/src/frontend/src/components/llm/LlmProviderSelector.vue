<template>
  <v-container fluid class="pa-0">
    <v-tabs v-model="activeTab" grow>
      <v-tab v-for="provider in providers" :key="provider.id" :value="provider.id">
        <v-icon left>{{ providerIcon(provider.id) }}</v-icon>
        {{ provider.name }}
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab" class="mt-4">
      <v-window-item v-for="provider in providers" :key="provider.id" :value="provider.id">
        <v-card flat>
          <v-card-text>
            <!-- Provider Configuration Form -->
            <v-form v-if="provider.config" ref="providerForms" v-model="formValidity[provider.id]">
              <v-text-field
                v-for="(config, key) in provider.config"
                :key="key"
                v-model="provider.config[key].value"
                :label="config.label || key"
                :type="config.type || 'text'"
                :required="config.required || false"
                :rules="getValidationRules(config)"
                :hint="config.hint"
                persistent-hint
                outlined
                dense
                class="mb-4"
              >
                <template v-if="config.appendIcon" v-slot:append>
                  <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                      <v-icon v-bind="attrs" v-on="on">
                        {{ config.appendIcon }}
                      </v-icon>
                    </template>
                    <span>{{ config.appendHint }}</span>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-form>
            
            <!-- Provider Info -->
            <v-alert v-if="provider.description" type="info" outlined dense class="mb-4">
              {{ provider.description }}
            </v-alert>
            
            <!-- Model Selection -->
            <v-select
              v-if="provider.models && provider.models.length > 0"
              v-model="selectedModels[provider.id]"
              :items="provider.models"
              item-text="name"
              item-value="id"
              :label="$t('llm.settings.select_model')"
              :loading="loadingModels[provider.id]"
              :disabled="loadingModels[provider.id]"
              outlined
              dense
              class="mb-4"
            >
              <template v-slot:item="{ item }">
                <v-list-item-content>
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="item.description">
                    {{ item.description }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </template>
            </v-select>
            
            <!-- Test Connection -->
            <v-btn
              color="primary"
              :loading="testing[provider.id]"
              :disabled="!isFormValid(provider.id) || testing[provider.id]"
              @click="testConnection(provider.id)"
              class="mr-2"
            >
              <v-icon left>mdi-connection</v-icon>
              {{ $t('llm.settings.test_connection') }}
            </v-btn>
            
            <v-btn
              color="success"
              :loading="saving"
              :disabled="!isFormValid(provider.id) || saving"
              @click="saveSettings(provider.id)"
            >
              <v-icon left>mdi-content-save</v-icon>
              {{ $t('common.actions.save') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>
    
    <!-- Test Connection Dialog -->
    <v-dialog v-model="testDialog" max-width="500">
      <v-card>
        <v-card-title class="headline">
          {{ testResult.success ? $t('llm.settings.connection_success') : $t('llm.settings.connection_failed') }}
        </v-card-title>
        <v-card-text>
          <p v-if="testResult.message">{{ testResult.message }}</p>
          <pre v-if="testResult.details" class="mt-2 pa-2 error--text" style="background: #ffebee; border-radius: 4px; overflow-x: auto;">
            {{ testResult.details }}
          </pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="testDialog = false">
            {{ $t('common.actions.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { defineComponent, ref, reactive, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'LlmProviderSelector',
  
  props: {
    close: {
      type: Function,
      default: null
    }
  },
  
  setup(props) {
    const store = useStore()
    const { t } = useI18n()
    
    // State
    const activeTab = ref(null)
    const saving = ref(false)
    const testing = reactive({})
    const testDialog = ref(false)
    const testResult = reactive({
      success: false,
      message: '',
      details: ''
    })
    const loadingModels = reactive({})
    const selectedModels = reactive({})
    const formValidity = reactive({})
    const providerForms = ref({})
    
    // Computed
    const providers = computed(() => {
      return store.state.llm.providers.map(provider => ({
        ...provider,
        config: provider.config ? Object.entries(provider.config).reduce((acc, [key, value]) => {
          acc[key] = { ...value, value: value.default || '' }
          return acc
        }, {}) : null
      }))
    })
    
    // Methods
    const providerIcon = (providerId) => {
      const icons = {
        'openai': 'mdi-robot',
        'anthropic': 'mdi-robot-outline',
        'huggingface': 'mdi-robot-love',
        'local': 'mdi-laptop',
        'azure': 'mdi-microsoft-azure',
        'google': 'mdi-google',
        'cohere': 'mdi-robot-confused',
        'replicate': 'mdi-reload'
      }
      return icons[providerId] || 'mdi-help-circle'
    }
    
    const getValidationRules = (config) => {
      const rules = []
      
      if (config.required) {
        rules.push(v => !!v || t('validation.required'))
      }
      
      if (config.type === 'email') {
        rules.push(v => !v || /.+@.+\..+/.test(v) || t('validation.email'))
      }
      
      if (config.minLength) {
        rules.push(v => !v || v.length >= config.minLength || t('validation.min_length', { length: config.minLength }))
      }
      
      if (config.maxLength) {
        rules.push(v => !v || v.length <= config.maxLength || t('validation.max_length', { length: config.maxLength }))
      }
      
      if (config.pattern) {
        const regex = new RegExp(config.pattern)
        rules.push(v => !v || regex.test(v) || (config.patternMessage || t('validation.invalid_format')))
      }
      
      return rules
    }
    
    const isFormValid = (providerId) => {
      return formValidity[providerId] !== false
    }
    
    const loadProviderSettings = async (providerId) => {
      try {
        const settings = await store.dispatch('llm/loadSettings', providerId)
        if (settings) {
          const provider = providers.value.find(p => p.id === providerId)
          if (provider && provider.config) {
            Object.keys(provider.config).forEach(key => {
              if (settings[key] !== undefined) {
                provider.config[key].value = settings[key]
              }
            })
          }
          
          if (settings.model) {
            selectedModels[providerId] = settings.model
          }
        }
      } catch (error) {
        console.error('Failed to load provider settings:', error)
      }
    }
    
    const fetchModels = async (providerId) => {
      if (loadingModels[providerId]) return
      
      try {
        loadingModels[providerId] = true
        await store.dispatch('llm/fetchModels', providerId)
      } catch (error) {
        console.error('Failed to fetch models:', error)
      } finally {
        loadingModels[providerId] = false
      }
    }
    
    const testConnection = async (providerId) => {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) return
      
      try {
        testing[providerId] = true
        
        const config = {}
        if (provider.config) {
          Object.entries(provider.config).forEach(([key, value]) => {
            config[key] = value.value
          })
        }
        
        const result = await store.dispatch('llm/testConnection', {
          providerId,
          config,
          model: selectedModels[providerId] || null
        })
        
        testResult.success = result.success
        testResult.message = result.message
        testResult.details = result.details
        testDialog.value = true
        
        if (result.success) {
          // If test is successful, we can save the settings
          await saveSettings(providerId, false)
        }
      } catch (error) {
        console.error('Test connection failed:', error)
        testResult.success = false
        testResult.message = t('llm.errors.test_connection_failed')
        testResult.details = error.message || error.toString()
        testDialog.value = true
      } finally {
        testing[providerId] = false
      }
    }
    
    const saveSettings = async (providerId, showSuccess = true) => {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) return
      
      try {
        saving.value = true
        
        const config = {}
        if (provider.config) {
          Object.entries(provider.config).forEach(([key, value]) => {
            config[key] = value.value
          })
        }
        
        await store.dispatch('llm/saveSettings', {
          providerId,
          config,
          model: selectedModels[providerId] || null
        })
        
        if (showSuccess) {
          store.dispatch('showSnackbar', {
            message: t('llm.messages.settings_saved'),
            color: 'success'
          })
        }
        
        // Close the dialog if this is a modal
        if (props.close) {
          props.close()
        }
      } catch (error) {
        console.error('Failed to save settings:', error)
        store.dispatch('showSnackbar', {
          message: t('llm.errors.save_failed'),
          color: 'error'
        })
      } finally {
        saving.value = false
      }
    }
    
    // Lifecycle hooks
    onMounted(async () => {
      try {
        await store.dispatch('llm/fetchProviders')
        
        if (providers.value.length > 0) {
          activeTab.value = providers.value[0].id
          
          // Load settings for all providers
          for (const provider of providers.value) {
            await loadProviderSettings(provider.id)
            await fetchModels(provider.id)
          }
        }
      } catch (error) {
        console.error('Failed to initialize provider selector:', error)
      }
    })
    
    // Watch for tab changes to load models if needed
    watch(activeTab, async (newProviderId) => {
      if (newProviderId) {
        await fetchModels(newProviderId)
      }
    })
    
    return {
      // State
      activeTab,
      saving,
      testing,
      testDialog,
      testResult,
      loadingModels,
      selectedModels,
      providerForms,
      
      // Computed
      providers,
      
      // Methods
      providerIcon,
      getValidationRules,
      isFormValid,
      testConnection,
      saveSettings
    }
  },
  
  watch: {
    // Watch for changes in providers to update the active tab
    providers: {
      immediate: true,
      handler(newProviders) {
        if (newProviders.length > 0 && !this.activeTab) {
          this.activeTab = newProviders[0].id
        }
      }
    }
  }
})
</script>

<style scoped>
.v-tab {
  text-transform: none !important;
  letter-spacing: normal;
}

.v-window {
  background: transparent;
}

.v-card {
  background: transparent;
}

/* Make the scrollbar more subtle */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
