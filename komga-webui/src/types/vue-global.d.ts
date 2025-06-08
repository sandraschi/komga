import Vue, { CombinedVueInstance } from 'vue'
import { Store } from 'vuex'
import { Router, Route } from 'vue-router'
import { Validation } from 'vuelidate'
import { LoDashStatic } from 'lodash'

// Augment Vue instance
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

// Augment CombinedVueInstance for SFCs
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalVueInstance extends CombinedVueInstance<
  Vue,
  Record<string, any>,
  Record<string, any>,
  Record<string, any>,
  Record<string, any>
> {
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