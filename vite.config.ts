import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function disableHmrClientWs(): Plugin {
  return {
    name: 'disable-hmr-client-ws',
    transform(code, id) {
      if (id.includes('vite/dist/client/client.mjs') || id.includes('@vite/client')) {
        return code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* HMR disabled: WebSocket connection skipped */'
        );
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), disableHmrClientWs()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR & WebSocket are disabled in AI Studio to prevent WebSocket connection errors in iframe
      hmr: false as const,
      ws: false as const,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
