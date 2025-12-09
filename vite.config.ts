import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 4200,
		proxy: {
			'/api': {
				target: 'https://api.coachboat-planer.de',
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			'/auth': {
				target: 'https://auth.coachboat-planer.de',
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/auth/, '')
			}
		}
	}
});

