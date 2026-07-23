import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/web',
  publicDir: '../../assets',
  build: { outDir: '../../dist/web', emptyOutDir: true },
  server: { port: 5174, strictPort: true },
});