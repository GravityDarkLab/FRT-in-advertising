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
const YEAR = new Date().getFullYear()

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
        <Container size="lg" className={classes.footerStack}>
          <div className={classes.social}>
            <a href={AUTHOR_GITHUB} className={classes.icon} aria-label="Achraf Labidi on GitHub">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
            </a>
            <a
              href={AUTHOR_LINKEDIN}
              className={classes.icon}
              aria-label="Achraf Labidi on LinkedIn"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  d="M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm.9 8.2v7.6h2.6v-7.6zm1.3-4.1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm3.4 4.1v7.6h2.6V14c0-1.1.4-1.9 1.5-1.9s1.3.9 1.3 1.9v3.8h2.6v-4.3c0-2.1-.7-3.6-3.1-3.6-1.3 0-2.1.6-2.4 1.2v-.9z"
                />
              </svg>
            </a>
          </div>
          <Text size="xs" fw={600}>
            © {YEAR} Achraf Labidi
          </Text>
          <Text size="xs" c="dimmed" className={classes.footnote}>
            A teaching tool from a 2022/23 seminar at the Technical University of Munich, rebuilt in
            2026. The ads are invented and refer to no real brand.{' '}
            <Anchor href={REPO} size="xs">
              Source on GitHub
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
