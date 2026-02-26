// __tests__/components/error-boundary.test.tsx
// ---------------------------------------------------------------------------
// Tests for the ErrorBoundary React class component.
//
// The component:
//   - Renders children normally when no error occurs
//   - Catches thrown errors and renders a fallback UI with:
//     * "Algo salio mal" heading
//     * Descriptive message in Spanish
//     * A unique error reference ID (Ref: ...)
//     * "Intentar de nuevo" retry button that resets the error state
//   - Logs the error to console.error
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'

// ---------------------------------------------------------------------------
// Helper: A component that throws on render
// ---------------------------------------------------------------------------
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test explosion: something broke in a child component')
  }
  return <div data-testid="child-content">Everything works fine</div>
}

// Suppress console.error noise from React's error boundary logging and our own
let consoleErrorSpy: jest.SpyInstance

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  // -----------------------------------------------------------------------
  // Normal rendering (no error)
  // -----------------------------------------------------------------------

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Everything works fine')).toBeInTheDocument()
  })

  it('should render multiple children without issues', () => {
    render(
      <ErrorBoundary>
        <p>First child</p>
        <p>Second child</p>
      </ErrorBoundary>
    )

    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Error state rendering
  // -----------------------------------------------------------------------

  it('should render error fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    // The child content should NOT be visible
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()

    // Error heading
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()

    // Descriptive message
    expect(
      screen.getByText(/error inesperado/i)
    ).toBeInTheDocument()
  })

  it('should display a reference ID in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    // The component generates a reference like "Ref: XXXXXXX"
    const refElement = screen.getByText(/Ref:/i)
    expect(refElement).toBeInTheDocument()
    // The ref value is Date.now().toString(36).toUpperCase() — alphanumeric
    expect(refElement.textContent).toMatch(/Ref:\s+[A-Z0-9]+/)
  })

  it('should display the retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /intentar de nuevo/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('should display the exclamation mark icon in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    // The component renders a "!" as the error icon
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Error logging
  // -----------------------------------------------------------------------

  it('should log the error details via console.error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    // componentDidCatch calls console.error with the error
    expect(consoleErrorSpy).toHaveBeenCalled()
    // Find the call that includes our boundary message
    const boundaryCall = consoleErrorSpy.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('Dashboard error boundary caught')
    )
    expect(boundaryCall).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Recovery via retry button
  // -----------------------------------------------------------------------

  it('should recover when retry button is clicked and child no longer throws', () => {
    // We need to control whether the child throws or not across re-renders.
    // We'll use a ref-like approach: first render throws, after reset it won't.
    let shouldThrow = true

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error('Conditional error')
      }
      return <div data-testid="recovered">Recovered successfully</div>
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>
    )

    // Verify error state
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.queryByTestId('recovered')).not.toBeInTheDocument()

    // Fix the condition so re-render succeeds
    shouldThrow = false

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }))

    // Should now show recovered content
    expect(screen.getByTestId('recovered')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument()
  })

  it('should show error state again if retry is clicked but child still throws', () => {
    // Child always throws
    function AlwaysThrowingChild(): React.ReactElement {
      throw new Error('Permanent error')
    }

    render(
      <ErrorBoundary>
        <AlwaysThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()

    // Click retry — child still throws, so error boundary catches again
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }))

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('should handle errors that occur deep in the component tree', () => {
    function DeepChild() {
      throw new Error('Deep tree error')
    }

    function MiddleComponent() {
      return (
        <div>
          <DeepChild />
        </div>
      )
    }

    render(
      <ErrorBoundary>
        <MiddleComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })
})
