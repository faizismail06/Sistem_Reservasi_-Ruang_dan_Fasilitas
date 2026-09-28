export default defineNuxtConfig({
  compatibilityDate: '2025-09-01',
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/main.css'],
  ui: { colorMode: false, fonts: false },
  devtools: { enabled: false },
  typescript: { strict: true },
  app: { head: { title: 'Ruang Kantor · Reservasi', htmlAttrs: { lang: 'id' } } }
})
