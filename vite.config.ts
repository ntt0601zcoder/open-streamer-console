import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@codemirror') || id.includes('@uiw/react-codemirror') || id.includes('@lezer')) {
            return 'codemirror';
          }
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('dashjs')) return 'dash';
          if (id.includes('recharts') || id.includes('victory-vendor')) return 'recharts';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('react-router')) return 'router';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler')
          ) {
            return 'react';
          }
          if (id.includes('@tanstack')) return 'tanstack';
          return undefined;
        },
      },
    },
  },
});
