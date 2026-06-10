import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = process.env.BO_API || 'http://localhost:4517';

// Source for the back-office UI. Builds into ../web, which the bo-web server serves.
export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: '../web',
        emptyOutDir: true,
    },
    server: {
        port: 4318,
        proxy: {
            '/api': { target: API, changeOrigin: true },
        },
    },
});
