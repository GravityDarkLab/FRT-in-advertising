import type { Box, ImageSize } from '../api'

const percent = (part: number, whole: number) => `${Math.round((part / whole) * 10000) / 100}%`

/** Position a face box over the video as percentages, so it tracks any display size. */
export function boxToPercent(box: Box, image: ImageSize) {
  return {
    left: percent(box.x, image.width),
    top: percent(box.y, image.height),
    width: percent(box.width, image.width),
    height: percent(box.height, image.height),
  }
}
