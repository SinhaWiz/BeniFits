import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest.config.ts doesn't enable test.globals, so Testing Library's
// automatic afterEach(cleanup) never registers - do it explicitly, or
// multi-test files leak DOM state between tests.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
