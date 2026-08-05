import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        equipaggio: resolve(__dirname, 'equipaggio.html'),
        regole: resolve(__dirname, 'regole.html'),
        priorita: resolve(__dirname, 'priorita.html'),
        base: resolve(__dirname, 'base.html'),
        mercato: resolve(__dirname, 'mercato.html'),
        mosse: resolve(__dirname, 'mosse.html'),
        status: resolve(__dirname, 'status.html'),
        annunci: resolve(__dirname, 'annunci.html'),
        gommoni: resolve(__dirname, 'gommoni.html'),
        motori: resolve(__dirname, 'motori.html'),
      },
    },
  },
})
