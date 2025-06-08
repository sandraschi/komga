<template>
  <button class="chat-fab" @click="toggleChat">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5v-2h14v2zm0-3H5V9h14v2zm0-3H5V6h14v2z"/>
    </svg>
  </button>
</template>

<script>
/**
 * ChatFab.vue - A Floating Action Button to toggle the chat modal.
 */
export default {
  name: 'ChatFab',
  methods: {
    /**
     * Emits an event to toggle the chat modal visibility.
     */
    toggleChat() {
      this.$emit('toggle-chat')
    },
  },
}
</script>

<style scoped>
.chat-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  background-color: #007bff; /* Komga primary color or a suitable theme color */
  color: white;
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.3s ease;
  z-index: 1000;
}

.chat-fab:hover {
  background-color: #0056b3; /* Darker shade for hover */
}

.chat-fab svg {
  fill: white;
}
</style>
