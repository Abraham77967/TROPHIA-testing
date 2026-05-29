import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**'
      ]
    }
  }
});
