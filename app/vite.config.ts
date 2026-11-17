import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// design/tokens.css liegt eine Ebene höher und ist die Quelle der Farben (E48)
export default defineConfig({ plugins: [sveltekit()], server: { fs: { allow: ['..'] } } });
