import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has neither of these and Mantine reads both. Assigned directly rather
// than with vi.stubGlobal, which `unstubGlobals` would undo after each test.
window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
