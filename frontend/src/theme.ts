import { createTheme, type MantineColorsTuple } from '@mantine/core'

// The machine's colour: the cyan of a detection box. Everything the model says is drawn in it.
const machine: MantineColorsTuple = [
  '#e3fbff',
  '#d0f2f8',
  '#a5e3ee',
  '#76d3e4',
  '#50c6db',
  '#38bed6',
  '#28bad5',
  '#15a3bc',
  '#0091a9',
  '#007e94',
]

const archivo = "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"

export const theme = createTheme({
  colors: { machine },
  primaryColor: 'machine',
  // One shade for both schemes: Mantine labels filled buttons in white either way,
  // and this is the lightest shade white stays readable on (4.8:1).
  primaryShade: 9,
  fontFamily: archivo,
  headings: { fontFamily: archivo, fontWeight: '800' },
  defaultRadius: 'md',
})
