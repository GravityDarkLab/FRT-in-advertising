import { expect, it } from 'vitest'
import { theme } from './theme'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05)
}

// Mantine labels a filled button in white whichever scheme is active (it decides
// from the light shade alone), so the fill must carry white text in both.
it.each(['light', 'dark'] as const)('filled buttons are readable in the %s scheme', (scheme) => {
  const shade = theme.primaryShade
  const index = typeof shade === 'object' ? shade[scheme] : shade
  const fill = theme.colors!.machine![index!]!

  expect(contrastWithWhite(fill)).toBeGreaterThanOrEqual(4.5)
})
