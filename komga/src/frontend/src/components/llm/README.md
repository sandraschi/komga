# LLM Components

A collection of Vue components for integrating LLM (Large Language Model) functionality into the Komga application.

## Components

### 1. LlmProviderSelector

A component for selecting and managing LLM providers and models.

#### Features
- Dropdown for selecting between available LLM providers
- Model management (load/unload)
- Visual indicators for model status
- Responsive design that works in the app bar

#### Props

- `autoSelectProvider` (Boolean, default: `true`) - Whether to automatically select the first available provider
- `autoSelectModel` (Boolean, default: `true`) - Whether to automatically select the first available model
- `autoLoadModel` (Boolean, default: `false`) - Whether to automatically load the selected model

#### Events

- `provider-selected` - Emitted when a provider is selected
- `model-selected` - Emitted when a model is selected
- `model-loaded` - Emitted when a model is successfully loaded
- `model-unloaded` - Emitted when a model is unloaded
- `error` - Emitted when an error occurs

### 2. LlmChat

A chat interface for interacting with LLM providers.

#### Props

- `systemPrompt` (String, default: 'You are a helpful assistant.') - The system prompt to use for the chat.
- `initialMessages` (Array, default: `[]`) - Initial messages to display in the chat.
- `autoFocus` (Boolean, default: `true`) - Whether to focus the input field when the component is mounted.
- `maxMessages` (Number, default: 50) - Maximum number of messages to keep in the chat history.

#### Events

- `input` - Emitted when the chat input changes.
- `send` - Emitted when a message is sent.
- `error` - Emitted when an error occurs.

### 2. LlmChatDialog

A dialog wrapper for the LlmChat component.

#### Props

All props from `LlmChat` plus:

- `title` (String, default: 'Chat') - The title of the dialog.
- `width` (Number|String, default: 800) - The width of the dialog.
- `maxWidth` (Number|String) - The maximum width of the dialog.
- `minHeight` (String, default: '500px') - The minimum height of the dialog.
- `maxHeight` (String, default: '80vh') - The maximum height of the dialog.
- `persistent` (Boolean, default: false) - Whether the dialog should be persistent.
- `fullscreen` (Boolean, default: false) - Whether the dialog should be fullscreen.
- `hideOverlay` (Boolean, default: false) - Whether to hide the overlay.
- `scrollable` (Boolean, default: true) - Whether the dialog content should be scrollable.

#### Events

All events from `LlmChat` plus:

- `update:fullscreen` - Emitted when the fullscreen state changes.
- `input` - Emitted when the dialog is opened or closed.

### 3. LlmChatFab

A floating action button that opens the LlmChatDialog.

#### Props

All props from `v-btn` plus:

- `iconName` (String, default: 'mdi-robot') - The icon to display on the button.
- `label` (String, default: 'Chat') - The label to display on the button.
- `position` (String, default: 'bottom-right') - The position of the button. Can be 'top-left', 'top-right', 'bottom-left', or 'bottom-right'.
- `offsetX` (Number, default: 16) - The horizontal offset from the edge of the screen.
- `offsetY` (Number, default: 16) - The vertical offset from the edge of the screen.
- `zIndex` (Number, default: 5) - The z-index of the button.

All props from `LlmChatDialog` are also supported and will be passed through.

#### Events

- `click` - Emitted when the button is clicked.
- `open` - Emitted when the dialog is opened.
- `close` - Emitted when the dialog is closed.

## Installation

1. Import and use the components directly:

```javascript
import { LlmChat, LlmChatDialog, LlmChatFab } from '@/components/llm'

export default {
  components: {
    LlmChat,
    LlmChatDialog,
    LlmChatFab
  }
}
```

2. Or use the Vue plugin to register all components globally:

```javascript
import Vue from 'vue'
import LlmComponents from '@/components/llm'

Vue.use(LlmComponents)
```

## Usage

### Basic Usage

```vue
<template>
  <div>
    <llm-chat />
  </div>
</template>

<script>
import { LlmChat } from '@/components/llm'

export default {
  components: {
    LlmChat
  }
}
</script>
```

### With Dialog

```vue
<template>
  <div>
    <v-btn @click="dialog = true">Open Chat</v-btn>
    
    <llm-chat-dialog v-model="dialog" />
  </div>
</template>

<script>
import { LlmChatDialog } from '@/components/llm'

export default {
  components: {
    LlmChatDialog
  },
  
  data() {
    return {
      dialog: false
    }
  }
}
</script>
```

### With FAB

```vue
<template>
  <div>
    <llm-chat-fab />
  </div>
</template>

<script>
import { LlmChatFab } from '@/components/llm'

export default {
  components: {
    LlmChatFab
  }
}
</script>
```

## Customization

You can customize the appearance and behavior of the components using props and slots. See the individual component documentation for more details.

## API

The components use the Vuex store module `llm` for state management. You can interact with the store using the following methods:

```javascript
// Dispatch an action
this.$store.dispatch('llm/actionName', payload)

// Commit a mutation
this.$store.commit('llm/mutationName', payload)

// Access state
this.$store.state.llm

// Access getters
this.$store.getters['llm/getterName']
```

## Dependencies

- Vue.js
- Vuetify
- Vuex
- Axios (for API calls)

## Browser Support

The components are built with modern JavaScript and may not work in older browsers. For best results, use the latest version of Chrome, Firefox, Safari, or Edge.
