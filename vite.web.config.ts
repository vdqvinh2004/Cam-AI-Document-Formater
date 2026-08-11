import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/web',
  publicDir: '../../assets',
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          return undefined;
        },
      },
    },
  },
  server: { port: 5174, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/web', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/web/components', import.meta.url)),
      '@/components/ui': fileURLToPath(new URL('./src/web/components/ui', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./src/web/lib', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./src/web/hooks', import.meta.url)),
    },
  },
});