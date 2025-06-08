declare module 'quasar' {
  import { Plugin } from 'vue'
  const Quasar: Plugin
  export { Quasar }
  export * from 'quasar/dist/types/feature-flag'
  export * from 'quasar/dist/types/ts-helpers'
  export * from 'quasar/dist/types/api/'
  export * from 'quasar/dist/types/v3-flag'
}
