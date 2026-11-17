import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Reine Browser-App: alle Seiten werden im Gerät gerendert, der Server liefert nur Dateien aus.
    adapter: adapter({ fallback: 'index.html' })
  }
};
