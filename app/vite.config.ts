import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// design/tokens.css liegt eine Ebene höher und ist die Quelle der Farben (E48)
// /abgleich/ geht wie im nginx an den Abgleich-Dienst (F4)
// /WebUntis/ wird beim Entwickeln wie im nginx an das WebUntis der Schule durchgereicht (V11)
const untis = process.env.UNTIS_SERVER ?? 'osz-lus.webuntis.com';
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: { allow: ['..'] },
    proxy: {
      '/WebUntis': { target: `https://${untis}`, changeOrigin: true, cookieDomainRewrite: '', secure: true },
      // Abgleich-Dienst (F4) beim Entwickeln: node abgleich/server.mjs
      '/abgleich': { target: `http://127.0.0.1:${process.env.ABGLEICH_PORT ?? 8129}` }
    }
  }
});
