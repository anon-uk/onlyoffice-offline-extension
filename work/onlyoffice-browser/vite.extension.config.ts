import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: path.join(project, 'pages'), base: './', publicDir: path.join(project, 'public'),
  build: { outDir: path.join(project, 'extension-build-v0.5'), emptyOutDir: true,
    rollupOptions: { input: path.join(project, 'pages/extension.html') } },
  worker: { rollupOptions: { output: { entryFileNames: 'wasm/x2t/[name]-[hash].js' } } },
});
