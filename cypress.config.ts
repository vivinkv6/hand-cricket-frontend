import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 15000,
  requestTimeout: 15000,
  responseTimeout: 30000,
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/hand-cricket.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
  },
});