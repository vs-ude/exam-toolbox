import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
  },
});
