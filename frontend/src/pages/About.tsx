import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import classes from './pages.module.css'
import { sources2022, sources2026, type Source } from './sources'

const REPO = 'https://github.com/GravityDarkLab/FRT-in-advertising'
const PAPER_2022 = '/paper/facial-classification-technologies-in-advertising-2022.pdf'
const UPDATE_2026 = `${REPO}/blob/main/docs/paper/2026-update.md`

// The group that built the original version with the author, in v1's order.
const originalTeam = [
  'Nicole Kubitza',
  'Adrian Pesch',
  'Caner Karaoğlu',
  'Markus Vrancea',
  'Ege Kurt',
  'Po Chieh Lin',
]

function SourceList({ label, sources }: { label: string; sources: Source[] }) {
  return (
    <ul className={classes.sources} aria-label={label}>
      {sources.map(({ cite, title, url }) => (
        <li key={title}>
          {url ? <Anchor href={url}>{title}</Anchor> : <span>{title}</span>}
          <span className={classes.cite}>{cite}</span>
        </li>
      ))}
    </ul>
  )
}

export function About() {
  return (
    <Container size="lg" className={classes.page}>
      <Stack gap={56}>
        <Stack gap="lg">
          <Title order={1} className={classes.title}>
            About this project
          </Title>
          <Text className={classes.lead}>
            A teaching tool built for the seminar “Making People Understand Facial Recognition
            Technologies: Building an AI Application as Didactic Tool” at the Technical University
            of Munich, winter semester 2022/23. Its purpose is to raise awareness.
          </Text>
        </Stack>

        <Stack gap="md" component="section" aria-labelledby="built-by">
          <Title order={2} id="built-by" className={classes.sectionTitle}>
            Built by
          </Title>
          <p className={classes.author}>Achraf Labidi</p>
          <Text className={classes.prose}>
            This version is an individual rework: the design, the code, the choice of models and the
            artwork were redone from scratch in 2026.
          </Text>
          <Text className={classes.prose}>
            The original version was a group project, built in 2022/23 together with{' '}
            {originalTeam.slice(0, -1).join(', ')} and {originalTeam.at(-1)}. The idea, the ad sets
            and much of the explanatory text come from that work.
          </Text>
        </Stack>

        <Stack gap="md" component="section" aria-labelledby="study-2022">
          <Title order={2} id="study-2022" className={classes.sectionTitle}>
            The 2022 study
          </Title>
          <Text className={classes.prose}>
            The original site was also a small study. Visitors answered the same questions before
            the demo, after it, and again after the theory, so that any shift in their attitude
            could be tracked. 51 participants took part, most of them computer science students at
            the Technical University of Munich.
          </Text>
          <ul className={classes.findings}>
            <li>
              Most participants rejected facial classification for personalised advertising and for
              hiring, and more than 66% disagreed with its widespread use in public surveillance.
            </li>
            <li>Targeting ads by emotion was rejected most strongly of all.</li>
            <li>
              Their views did not change significantly from one round of questions to the next.
            </li>
            <li>
              More than one in ten did not use their camera, and several criticised the demo for
              classifying them wrongly.
            </li>
          </ul>
          <Text className={classes.prose}>
            The paper sets these results beside a survey of where the technology is used, a
            commercial product it imitates, and the ethical objections to it.
          </Text>
          <Text className={classes.prose}>
            <Anchor href={PAPER_2022}>Read the 2022 paper</Anchor> (PDF, 10 pages).
          </Text>
        </Stack>

        <Stack gap="md" component="section" aria-labelledby="update-2026">
          <Title order={2} id="update-2026" className={classes.sectionTitle}>
            The 2026 update
          </Title>
          <Text className={classes.prose}>
            The rebuild answers the last of those criticisms in two ways. The models were replaced
            after testing candidates on labelled faces, and the page now says how sure it is of each
            guess in a way that matches how often the guess is right. A companion write-up records
            what was changed, what was measured, and what still holds from 2022.
          </Text>
          <Text className={classes.prose}>
            This version does not collect answers. It stores nothing: no questionnaire, no images,
            no accounts. A webcam frame is sent to the analysis service, held in memory for a
            fraction of a second, and discarded. The findings above are therefore those of 2022,
            made with the original models.
          </Text>
          <Text className={classes.prose}>
            <Anchor href={UPDATE_2026}>Read the 2026 update</Anchor> on GitHub.
          </Text>
        </Stack>

        <Stack gap="md" component="section" aria-labelledby="sources">
          <Title order={2} id="sources" className={classes.sectionTitle}>
            Sources
          </Title>
          <Title order={3} className={classes.subTitle}>
            Cited in the 2022 paper
          </Title>
          <SourceList label="Sources of the 2022 paper" sources={sources2022} />
          <Title order={3} className={classes.subTitle}>
            Added in 2026
          </Title>
          <SourceList label="Sources added in 2026" sources={sources2026} />
        </Stack>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            Code and artwork
          </Title>
          <Text className={classes.prose}>
            The advertisements were drawn for this project. They refer to no real brand.
          </Text>
          <Text className={classes.prose}>
            The code, including the original version on the <code>deprecated-v1</code> branch, is on{' '}
            <Anchor href={REPO}>GitHub</Anchor>.
          </Text>
        </Stack>
      </Stack>
    </Container>
  )
}
