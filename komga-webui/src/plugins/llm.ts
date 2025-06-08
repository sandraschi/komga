import type { App } from 'vue'
import MetabookGenerationDialog from '@/components/llm/MetabookGenerationDialog.vue'
import MetabookGenerationButton from '@/components/llm/MetabookGenerationButton.vue'
import BookSummaryViewer from '@/components/llm/BookSummaryViewer.vue'
import BookSummaryButton from '@/components/llm/BookSummaryButton.vue'

export default {
  install(app: App) {
    // Register global components
    app.component('MetabookGenerationDialog', MetabookGenerationDialog)
    app.component('MetabookGenerationButton', MetabookGenerationButton)
    app.component('BookSummaryViewer', BookSummaryViewer)
    app.component('BookSummaryButton', BookSummaryButton)
    
    // You can also add global methods or properties here if needed
    // app.config.globalProperties.$metabook = {
    //   generate: (bookId: string) => {
    //     // Implementation
    //   }
    // }
  }
}
