import { Anchor, Container, MantineProvider, Text } from '@mantine/core'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import classes from './App.module.css'
import { About } from './pages/About'
import { Demo } from './pages/Demo'
import { Intro } from './pages/Intro'
import { NotFound } from './pages/NotFound'
import { Theory } from './pages/Theory'
import { theme } from './theme'

const REPO = 'https://github.com/GravityDarkLab/FRT-in-advertising'
const AUTHOR_GITHUB = 'https://github.com/GravityDarkLab'
const AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/ashraf-labidi-0xff3e/'

const links = [
  { to: '/', label: 'Introduction' },
  { to: '/demo', label: 'Demo' },
  { to: '/theory', label: 'Theory' },
  { to: '/about', label: 'About' },
]

/** Header, routed page, footer. Separate from App so tests can mount it in a memory router. */
export function Shell() {
  return (
    <div className={classes.shell}>
      <header className={classes.header}>
        <Container size="lg" className={classes.bar}>
          <Link to="/" className={classes.wordmark} aria-label="FRT in Advertising, home">
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
              <path
                d="M6 12V6h6M26 12V6h-6M6 20v6h6M26 20v6h-6"
                fill="none"
                stroke="var(--mantine-color-machine-6)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="16" r="4" fill="var(--ad-yellow)" />
            </svg>
            <span className={classes.wordmarkText}>FRT in Advertising</span>
          </Link>
          <nav aria-label="Main" className={classes.nav}>
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} end className={classes.link}>
                {label}
              </NavLink>
            ))}
          </nav>
        </Container>
      </header>

      <main className={classes.main}>
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className={classes.footer}>
        <Container size="lg" className={classes.footerRow}>
          <Text size="sm" c="dimmed">
            A teaching tool from a 2022/23 seminar at the Technical University of Munich, rebuilt in
            2026. The ads are invented and refer to no real brand.{' '}
            <Anchor href={REPO} size="sm">
              Source on GitHub
            </Anchor>
          </Text>
          <Text size="sm" className={classes.author}>
            Achraf Labidi on{' '}
            <Anchor href={AUTHOR_GITHUB} size="sm">
              GitHub
            </Anchor>{' '}
            and{' '}
            <Anchor href={AUTHOR_LINKEDIN} size="sm">
              LinkedIn
            </Anchor>
          </Text>
        </Container>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </MantineProvider>
  )
}
