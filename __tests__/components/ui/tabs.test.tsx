import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Tabs } from '@/components/ui/tabs'

describe('Tabs', () => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'patients', label: 'Patients' },
    { id: 'settings', label: 'Settings' },
  ]

  it('renders all tab labels', () => {
    render(<Tabs tabs={tabs} activeTab="overview" onChange={jest.fn()} />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Patients')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<Tabs tabs={tabs} activeTab="patients" onChange={jest.fn()} />)
    const activeBtn = screen.getByText('Patients').closest('button')!
    expect(activeBtn.className).toContain('bg-surface-2')
    expect(activeBtn.className).toContain('text-brand-purple')
  })

  it('applies muted style to inactive tabs', () => {
    render(<Tabs tabs={tabs} activeTab="overview" onChange={jest.fn()} />)
    const inactiveBtn = screen.getByText('Settings').closest('button')!
    expect(inactiveBtn.className).toContain('text-text-muted')
  })

  it('calls onChange with tab id on click', () => {
    const onChange = jest.fn()
    render(<Tabs tabs={tabs} activeTab="overview" onChange={onChange} />)
    fireEvent.click(screen.getByText('Settings'))
    expect(onChange).toHaveBeenCalledWith('settings')
  })

  it('renders tab icon when provided', () => {
    const IconComponent = (props: Record<string, unknown>) => <svg data-testid="tab-icon" {...props} />
    const tabsWithIcon = [
      { id: 'home', label: 'Home', icon: IconComponent },
    ]
    render(<Tabs tabs={tabsWithIcon} activeTab="home" onChange={jest.fn()} />)
    expect(screen.getByTestId('tab-icon')).toBeInTheDocument()
  })
})
