// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Field } from './index'

it('canonicalizes leading zeroes in every numeric field', () => {
  function Harness() {
    return <Field label="Amount" type="number" value={300} onChange={() => undefined} />
  }

  render(<Harness />)
  const input = screen.getByLabelText('Amount') as HTMLInputElement
  fireEvent.change(input, { target: { value: '0300' } })
  expect(input.value).toBe('300')
})
