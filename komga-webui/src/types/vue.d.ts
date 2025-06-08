import Vue from 'vue'
import { Store } from 'vuex'
import { Router, Route } from 'vue-router'
import { Validation } from 'vuelidate'
import { LoDashStatic } from 'lodash'

// Add global properties to the Vue instance
// Extend as needed for all plugins and prototype properties

declare module 'vue/types/vue' {
  interface Vue {
    $http: any
    $eventHub: Vue
    $router: Router
    $route: Route
    $store: Store<any>
    $v?: Validation
    $_: LoDashStatic
    $komgaSettings?: any
    $komgaBooks?: any
    $komgaLogin?: any
    $actuator?: any
    $komgaReleases?: any
    $debug?: (...args: any[]) => void
    $vuetify?: any
  }
}

declare module 'vue/types/options' {
  // Add router and store to component options
  interface ComponentOptions<V extends Vue> {
    router?: Router
    store?: Store<any>
    vuetify?: any
    i18n?: any
    validations?: any
  }
}
