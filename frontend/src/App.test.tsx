import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Shell } from './App'
import { renderAt } from './test/render'

const pages = [
  { link: 'Introduction', path: '/', heading: /a camera reads your face/i },
  { link: 'Demo', path: '/demo', heading: /live demo/i },
  { link: 'Theory', path: '/theory', heading: /how a machine sorts faces/i },
  { link: 'About', path: '/about', heading: /about this project/i },
]

const mainNav = () => screen.getByRole('navigation', { name: 'Main' })

describe('site shell', () => {
  it.each(pages)('shows the $link page at $path', ({ path, heading }) => {
    renderAt(path, <Shell />)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(mainNav()).toBeInTheDocument()
  })

  it.each(pages)('reaches the $link page from the navigation', async ({ link, heading }) => {
    renderAt('/nowhere', <Shell />)

    await userEvent.click(within(mainNav()).getByRole('link', { name: link }))

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it.each(pages)('ends the $link page with the author, as icon links', ({ path }) => {
    renderAt(path, <Shell />)

    const footer = within(screen.getByRole('contentinfo'))
    const github = footer.getByRole('link', { name: 'Achraf Labidi on GitHub' })
    const linkedin = footer.getByRole('link', { name: 'Achraf Labidi on LinkedIn' })
    expect(github).toHaveAttribute('href', 'https://github.com/GravityDarkLab')
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/ashraf-labidi-0xff3e/')
    // Icons only: the name is carried by the label, the picture is hidden from screen readers.
    for (const link of [github, linkedin]) {
      expect(link).toHaveTextContent('')
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('carries a copyright line with the current year', () => {
    renderAt('/', <Shell />)

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      `© ${new Date().getFullYear()} Achraf Labidi`,
    )
  })

  it('still links the source code from the footer', () => {
    renderAt('/', <Shell />)

    expect(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Source on GitHub' }),
    ).toHaveAttribute('href', 'https://github.com/GravityDarkLab/FRT-in-advertising')
  })

  it('marks the current page in the navigation', () => {
    renderAt('/theory', <Shell />)

    expect(within(mainNav()).getByRole('link', { name: 'Theory' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(mainNav()).getByRole('link', { name: 'About' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('says so when a page does not exist, and offers the way home', async () => {
    renderAt('/no/such/page', <Shell />)

    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: /back to the introduction/i }))
    expect(
      screen.getByRole('heading', { level: 1, name: /a camera reads your face/i }),
    ).toBeInTheDocument()
  })

  it('leads from the introduction and the theory into the demo', async () => {
    renderAt('/', <Shell />)

    await userEvent.click(screen.getAllByRole('link', { name: /try the demo/i })[0]!)

    expect(screen.getByRole('heading', { level: 1, name: /live demo/i })).toBeInTheDocument()
  })

  it('offers no way into the survey that v1 had', () => {
    for (const { path } of pages) {
      const { unmount } = renderAt(path, <Shell />)
      expect(screen.queryByRole('link', { name: /survey|questionnaire/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /survey|questionnaire/i })).toBeNull()
      unmount()
    }
  })

  it('opens with a worked example: a face read as seventeen, and the ads that follow', () => {
    renderAt('/', <Shell />)

    const example = screen.getByRole('figure', { name: /example/i })
    expect(within(example).getByText('about 17')).toBeInTheDocument()
    expect(within(example).getByText('happy')).toBeInTheDocument()
    expect(within(example).getByText('Good mood? Make it a round.')).toBeInTheDocument()
    expect(example).toHaveTextContent('Chosen for someone aged 16–17 who looks happy.')
    expect(within(example).getByRole('img', { name: /beer/i })).toBeInTheDocument()
  })

  it('names the four inference stages in order', () => {
    renderAt('/theory', <Shell />)

    const stages = within(screen.getByRole('list', { name: /stages/i })).getAllByRole('listitem')
    expect(stages.map((stage) => within(stage).getByRole('heading').textContent)).toEqual([
      'Detection',
      'Alignment',
      'Representation',
      'Verification',
    ])
  })

  it("names the rework as one person's work", () => {
    renderAt('/about', <Shell />)

    const builtBy = screen.getByRole('region', { name: 'Built by' })
    expect(builtBy).toHaveTextContent('Achraf Labidi')
    expect(builtBy).toHaveTextContent(/individual rework/i)
    expect(screen.queryByRole('list', { name: /project members/i })).toBeNull()
  })

  it('credits the group that built the original version', () => {
    renderAt('/about', <Shell />)

    const original = screen.getByText(/original version was a group project/i)
    for (const name of [
      'Nicole Kubitza',
      'Adrian Pesch',
      'Caner Karaoğlu',
      'Markus Vrancea',
      'Ege Kurt',
      'Po Chieh Lin',
    ]) {
      expect(original).toHaveTextContent(name)
    }
  })

  describe('the study on the About page', () => {
    const about = () => renderAt('/about', <Shell />)

    it('links the original 2022 paper, served by the site itself', () => {
      about()

      const paper = screen.getByRole('link', { name: /read the 2022 paper/i })
      expect(paper).toHaveAttribute(
        'href',
        '/paper/facial-classification-technologies-in-advertising-2022.pdf',
      )
    })

    it('links the 2026 update', () => {
      about()

      expect(screen.getByRole('link', { name: /read the 2026 update/i })).toHaveAttribute(
        'href',
        expect.stringMatching(/docs\/paper\/2026-update\.md$/),
      )
    })

    it('reports what the 2022 study found', () => {
      about()

      const study = screen.getByRole('region', { name: /the 2022 study/i })
      expect(study).toHaveTextContent('51 participants')
      expect(study).toHaveTextContent(/more than 66%/i)
      expect(study).toHaveTextContent(/did not use their camera/i)
    })

    it('no longer says the study was dropped', () => {
      about()

      expect(document.body).not.toHaveTextContent(/drops the study/i)
    })

    it('lists the sources, old and new, with a link wherever one exists', () => {
      about()

      const from2022 = within(screen.getByRole('list', { name: /sources of the 2022 paper/i }))
      const from2026 = within(screen.getByRole('list', { name: /sources added in 2026/i }))
      expect(from2022.getAllByRole('listitem')).toHaveLength(13)
      expect(from2026.getAllByRole('listitem').length).toBeGreaterThanOrEqual(8)
      expect(from2022.getByRole('link', { name: /gender shades/i })).toBeInTheDocument()
      expect(
        from2026.getByRole('link', { name: /FairFace: Face Attribute Dataset/i }),
      ).toHaveAttribute('href', 'https://arxiv.org/abs/1908.04913')
      for (const link of [...from2022.getAllByRole('link'), ...from2026.getAllByRole('link')]) {
        expect(link.getAttribute('href')).toMatch(/^https:\/\//)
      }
    })
  })
})
