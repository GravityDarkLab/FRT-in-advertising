import type { SVGProps } from 'react'

const MACHINE = 'var(--mantine-color-machine-6)'

/** A schematic face on a 96 x 96 grid, drawn in the current text colour. */
function Face({ tilt = 0, opacity = 1 }: { tilt?: number; opacity?: number }) {
  return (
    <g
      transform={`rotate(${tilt} 48 50)`}
      opacity={opacity}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <ellipse cx="48" cy="50" rx="23" ry="29" />
      <circle cx="39" cy="45" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="57" cy="45" r="2.2" fill="currentColor" stroke="none" />
      <path d="M48 49v9M40 65q8 6 16 0" />
    </g>
  )
}

function Brackets() {
  return (
    <path
      d="M17 26V13h13M79 26V13H66M17 74v13h13M79 74v13H66"
      fill="none"
      stroke={MACHINE}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

type FigureProps = SVGProps<SVGSVGElement>

export function DetectionPictogram(props: FigureProps) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" {...props}>
      <Face />
      <Brackets />
    </svg>
  )
}

export function AlignmentPictogram(props: FigureProps) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" {...props}>
      <Face tilt={-24} opacity={0.25} />
      <Face />
      <path
        d="M20 22a36 36 0 0 1 22-12m0 0-7-5m7 5-5 7"
        fill="none"
        stroke={MACHINE}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RepresentationPictogram(props: FigureProps) {
  const heights = [34, 58, 22, 46, 66, 30, 52]
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" {...props}>
      <path
        d="M16 14H9v68h7M80 14h7v68h-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {heights.map((height, index) => (
        <rect
          key={index}
          x={20 + index * 8.4}
          y={78 - height}
          width="5.4"
          height={height}
          rx="2.7"
          fill={MACHINE}
        />
      ))}
    </svg>
  )
}

export function VerificationPictogram(props: FigureProps) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" {...props}>
      <rect x="10" y="16" width="76" height="18" rx="9" fill={MACHINE} />
      <path
        d="M19 25l4 4 7-8"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10" y="40" width="58" height="18" rx="9" fill="currentColor" opacity="0.18" />
      <rect x="10" y="64" width="40" height="18" rx="9" fill="currentColor" opacity="0.18" />
    </svg>
  )
}

/** What the detector hands on: a box and five landmarks. */
export function FaceScan(props: FigureProps) {
  const landmarks = [
    [39, 45],
    [57, 45],
    [48, 57],
    [40, 66],
    [56, 66],
  ] as const
  return (
    <svg
      viewBox="0 0 96 100"
      role="img"
      aria-label="A schematic face with a detection box around it and five landmarks marked: both eyes, the nose and the corners of the mouth"
      {...props}
    >
      <Face />
      <Brackets />
      <path
        d="M39 45 57 45 48 57ZM40 66 48 57 56 66"
        fill="none"
        stroke={MACHINE}
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {landmarks.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={MACHINE} />
      ))}
    </svg>
  )
}
