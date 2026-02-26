import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Modal } from '@/components/ui/modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Modal Content</p>
      </Modal>
    )
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('renders title and description', () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Title" description="My Description">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
    expect(screen.getByText('My Description')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Body</p>
      </Modal>
    )
    fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on backdrop click', () => {
    const onClose = jest.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Body</p>
      </Modal>
    )
    // Click backdrop (first child with animate-fade-in)
    const backdrop = document.querySelector('.backdrop-blur-sm')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Body</p>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides close button when showClose is false', () => {
    render(
      <Modal open={true} onClose={() => {}} showClose={false}>
        <p>Body</p>
      </Modal>
    )
    expect(screen.queryByLabelText('Cerrar')).not.toBeInTheDocument()
  })
})
