// jest.setup.ts
// Runs after the test environment is set up (setupFilesAfterEnv).
// Extends Jest matchers with @testing-library/jest-dom utilities
// like toBeInTheDocument(), toHaveTextContent(), toBeVisible(), etc.
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Global mocks for browser APIs not available in jsdom
// ---------------------------------------------------------------------------

// window.matchMedia — used by many UI libraries and responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// IntersectionObserver — used by lazy-loading images and infinite scroll
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})
window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver

// ResizeObserver — used by recharts and responsive containers
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as unknown as typeof ResizeObserver

// ---------------------------------------------------------------------------
// Suppress specific console warnings during tests
// ---------------------------------------------------------------------------

// Next.js App Router emits warnings about useSearchParams needing Suspense —
// these are handled in components but still noisy in test output.
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : ''
  if (message.includes('useSearchParams')) return
  originalConsoleError(...args)
}
