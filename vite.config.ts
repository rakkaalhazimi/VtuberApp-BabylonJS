import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';



export default defineConfig({
  assetsInclude: ['**/*.pmx', '**/*.pmd', '**/*.vmd', '**/*.sph', '**/*.spa'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
  },
});
