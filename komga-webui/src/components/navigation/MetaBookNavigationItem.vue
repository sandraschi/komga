<template>
  <v-list-item
    :to="{ name: 'metabooks' }"
    :class="{ 'v-list-item--active': isActive }"
    class="v-list-item"
    exact
  >
    <v-list-item-icon>
      <v-icon>mdi-book-multiple</v-icon>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-title>Metabooks</v-list-item-title>
    </v-list-item-content>
  </v-list-item>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class MetabookNavigationItem extends Vue {
  private get isActive(): boolean {
    return this.$route.path.startsWith('/metabooks')
  }
}
</script>
