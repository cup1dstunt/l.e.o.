import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// design/tokens.css liegt eine Ebene höher und ist die Quelle der Farben (E48)
// /WebUntis/ wird beim Entwickeln wie im nginx an das WebUntis der Schule durchgereicht (V11)
const untis = process.env.UNTIS_SERVER ?? 'osz-lus.webuntis.com';
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: { allow: ['..'] },
    proxy: { '/WebUntis': { target: `https://${untis}`, changeOrigin: true, cookieDomainRewrite: '', secure: true } }
  }
});
