import '@fontsource-variable/archivo/wdth.css'
// Mantine's styles, only for the components this site uses (the full sheet is 6x larger).
import '@mantine/core/styles/baseline.css'
import '@mantine/core/styles/default-css-variables.css'
import '@mantine/core/styles/global.css'
import '@mantine/core/styles/UnstyledButton.css'
import '@mantine/core/styles/Button.css'
import '@mantine/core/styles/Loader.css'
import '@mantine/core/styles/CloseButton.css'
import '@mantine/core/styles/Group.css'
import '@mantine/core/styles/Stack.css'
import '@mantine/core/styles/Container.css'
import '@mantine/core/styles/Text.css'
import '@mantine/core/styles/Title.css'
import '@mantine/core/styles/Anchor.css'
import '@mantine/core/styles/Alert.css'
import '@mantine/core/styles/Table.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
