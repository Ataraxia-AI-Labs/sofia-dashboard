// jest.setup.ts
// Runs after the test environment is set up (setupFilesAfterEnv).
// Extends Jest matchers with @testing-library/jest-dom utilities
// like toBeInTheDocument(), toHaveTextContent(), toBeVisible(), etc.
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// S122: global mocks for next-intl + next/navigation
// ---------------------------------------------------------------------------
// Without these, every component that calls `useTranslations(namespace)` or
// `useRouter()`/`usePathname()`/`useSearchParams()` crashes in test env with
// "useTranslations: missing translation context" or "invariant: app router
// not mounted". Each test was importing them ad hoc; this centralizes the
// stubs so new tests work out of the box.

// useTranslations: returns a function that just echoes the key, optionally
// interpolating {placeholder} with the values dict — close enough to the
// real next-intl behavior for assertion purposes.
jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    const full = namespace ? `${namespace}.${key}` : key
    if (!values) return full
    let out = full
    for (const [k, v] of Object.entries(values)) {
      out = out.replace(new RegExp(`{${k}}`, 'g'), String(v))
    }
    return out
  },
  useLocale: () => 'es',
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString(),
    number: (n: number) => String(n),
    relativeTime: (d: Date) => d.toISOString(),
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// next/navigation: stub the App Router hooks. Tests that need to assert
// navigation should `jest.spyOn` on the returned mocks or override per-test.
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

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
