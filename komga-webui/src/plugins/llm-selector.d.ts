import { PluginObject } from 'vue'
import { Store } from 'vuex'

declare const LlmSelectorPlugin: PluginObject<{ store: Store<any> }>
export default LlmSelectorPlugin
