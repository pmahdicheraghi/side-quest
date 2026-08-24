import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

const buildVersion = `${packageJson.version}-${Date.now().toString(36)}`;

function appVersionFile(): Plugin {
  return {
    name: 'side-quest-version-file',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ version: buildVersion })}\n`,
      });
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  plugins: [react(), appVersionFile()],
});
