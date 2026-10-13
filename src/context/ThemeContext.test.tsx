// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { ThemeProvider } from './ThemeContext'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  vi.unstubAllGlobals()
})

it('persists the theme and applies it to the document', () => {
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>)

  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('buildmyidea-theme')).toBe('dark')
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
})
