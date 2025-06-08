<template>
  <div class="pa-6">
    <v-row align="center" justify="center">
      <v-img src="../assets/logo.svg"
             :max-width="logoWidth"
      />
    </v-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'StartupView',
  computed: {
    logoWidth(): number {
      let l = 100
      switch ((this as any).$vuetify.breakpoint.name) {
        case 'xs':
          l = 100
        case 'sm':
        case 'md':
          l = 200
        case 'lg':
        case 'xl':
        default:
          l = 300
      }
      return l
    },
  },
  async mounted() {
    try {
      if ((this as any).$route.query.xAuthToken) {
        try {
          await (this as any).$komgaLogin.setCookie((this as any).$route.query.xAuthToken.toString())
        } catch (e) {
          (this as any).$debug(e.message)
        }
      }

      await (this as any).$store.dispatch('getMe')
      await (this as any).$store.dispatch('getLibraries')
      await (this as any).$store.dispatch('getClientSettingsGlobal')
      await (this as any).$store.dispatch('getClientSettingsUser')
      (this as any).$router.back()
    } catch (e) {
      (this as any).$router.push({name: 'login', query: {redirect: (this as any).$route.query.redirect}})
    }
  },
})
</script>

<style scoped>

</style>
