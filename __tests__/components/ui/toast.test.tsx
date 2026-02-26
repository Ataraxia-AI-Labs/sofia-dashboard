import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ToastProvider, useToast } from '@/components/ui/toast'

function ToastTrigger() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show success</button>
      <button onClick={() => toast.error('Error message')}>Show error</button>
      <button onClick={() => toast.warning('Warning message')}>Show warning</button>
      <button onClick={() => toast.info('Info message')}>Show info</button>
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows success toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('shows error toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show error'))
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('shows warning toast', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show warning'))
    expect(screen.getByText('Warning message')).toBeInTheDocument()
  })

  it('auto-dismisses after duration', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('can dismiss toast by clicking X', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show info'))
    expect(screen.getByText('Info message')).toBeInTheDocument()

    // Find the X button within the toast
    const toastEl = screen.getByText('Info message').closest('[class*="animate-slide-in"]')
    const closeBtn = toastEl?.querySelector('button')
    if (closeBtn) fireEvent.click(closeBtn)

    expect(screen.queryByText('Info message')).not.toBeInTheDocument()
  })

  it('limits to 5 toasts max', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    // Fire 7 toasts
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('Show success'))
    }
    // Should only show max 5 (actually keeps last 5)
    const toasts = screen.getAllByText('Success message')
    expect(toasts.length).toBeLessThanOrEqual(5)
  })

  it('throws when useToast is used outside provider', () => {
    function BadComponent() {
      useToast()
      return <div />
    }
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<BadComponent />)).toThrow('useToast must be used within ToastProvider')
    spy.mockRestore()
  })
})
