import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { theme } from '../theme'

/** Render with the providers the real app has, at a given address. */
export function renderAt(path: string, ui: ReactElement) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </MantineProvider>,
  )
}
