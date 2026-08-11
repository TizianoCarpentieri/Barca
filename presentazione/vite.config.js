import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      canvg: resolve(__dirname, 'src/js/pdf-optional-stub.js'),
      dompurify: resolve(__dirname, 'src/js/pdf-optional-stub.js'),
      html2canvas: resolve(__dirname, 'src/js/pdf-optional-stub.js'),
    },
  },
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
        accessori: resolve(__dirname, 'accessori.html'),
      },
    },
  },
})
