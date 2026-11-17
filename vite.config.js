import { defineConfig } from 'vite'

// O app é o protótipo (prototipo/app.html). O Vite empacota só a ponte com o Supabase (ponte.iife.js);
// scripts/montar.mjs junta tudo em dist/.
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    lib: { entry: 'src/ponte.js', formats: ['iife'], name: 'ArenaPonte', fileName: () => 'ponte.iife.js' },
    emptyOutDir: true,
  },
  test: { environment: 'jsdom' },
})
