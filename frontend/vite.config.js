import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    // html2pdf.js pulls in jspdf + html2canvas (very large, non-ESM) which can
    // crash esbuild's dep-optimizer on Windows. We dynamically import it only
    // when the user clicks "Download PDF", so exclude it from pre-bundling.
    exclude: ['html2pdf.js'],
  },
});
