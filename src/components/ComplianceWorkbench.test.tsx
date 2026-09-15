// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { demoStartup } from '../data/demoStartup'
import { ComplianceWorkbench } from './ComplianceWorkbench'

afterEach(cleanup)
it('requires review and explicit selection before adding actions, and invalidates results after facts change', () => {
  const onAdd = vi.fn()
  render(<ComplianceWorkbench startup={{ ...demoStartup, id: 'test', ownerId: 'test' }} onAdd={onAdd} />)
  fireEvent.change(screen.getByLabelText('Sales market'), { target: { value: 'India' } })
  fireEvent.click(screen.getByRole('button', { name: 'Build with compliance RAG' }))
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  fireEvent.click(screen.getByRole('button', { name: 'Add 1 selected review actions' }))
  expect(onAdd).toHaveBeenCalledTimes(1)
  expect(onAdd.mock.calls[0][0][0].status).toBe('Not started')
  fireEvent.change(screen.getByLabelText('Sales market'), { target: { value: 'Other' } })
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
})
