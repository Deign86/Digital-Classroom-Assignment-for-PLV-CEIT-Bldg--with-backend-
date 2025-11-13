import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Polyfill matchMedia for components that use it
if (typeof (globalThis as any).matchMedia === 'undefined') {
  (globalThis as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill for Radix UI pointer capture (jsdom doesn't support it)
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function() { return false; };
  Element.prototype.setPointerCapture = function() {};
  Element.prototype.releasePointerCapture = function() {};
}

// Optional MSW setup: if MSW is installed, wire up the test server.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setupServer } = require('msw/node');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handlers } = require('./mocks/handlers');

  const server = setupServer(...(handlers || []));

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
} catch (e) {
  // msw not installed — tests will run without network mocking.
}
