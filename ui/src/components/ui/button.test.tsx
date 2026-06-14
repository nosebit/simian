import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDefined()
  })

  it('handles custom class names', () => {
    render(<Button className="test-class">Styled</Button>)
    const button = screen.getByRole('button', { name: /styled/i })
    expect(button.className).toContain('test-class')
  })
})
