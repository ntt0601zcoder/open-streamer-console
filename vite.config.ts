import { readFileSync } from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Resolve the console version to bake into the bundle so the running app can
// compare itself against the server version reported by /config.
//
// The release workflow passes the pushed git tag in as the APP_VERSION
// build-arg → ENV (the Docker build context has no .git, so we never shell
// out to `git`). Self-builds without that env fall back to package.json.
function resolveAppVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
    version: string;
  };
  return pkg.version;
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
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
          if (
            id.includes('@codemirror') ||
            id.includes('@uiw/react-codemirror') ||
            id.includes('@lezer')
          ) {
            return 'codemirror';
          }
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('dashjs')) return 'dash';
          if (id.includes('react-diff-viewer-continued')) return 'diff';
          if (id.includes('recharts') || id.includes('victory-vendor')) return 'recharts';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'react';
          }
          if (id.includes('@tanstack')) return 'tanstack';
          return undefined;
        },
      },
    },
  },
});
