import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import type { Ad, Attributes } from '../api'
import { AdCard } from '../demo/AdCard'
import { targetingReason } from '../demo/ads'
import { Readout } from '../demo/Readout'
import classes from './pages.module.css'

// A plausible reading, and two ads from the 16-17 set with the lines written for a good mood.
const exampleReading: Attributes = {
  age: { estimate: 17.4, bracket: { min: 10, max: 19 }, confidence: 0.62 },
  gender: { label: 'female', confidence: 0.93 },
  race: { label: 'White', confidence: 0.88 },
  emotion: { label: 'happiness', confidence: 0.44 },
  mood: { label: 'up', confidence: 0.84 },
}
const exampleAds: Ad[] = [
  { id: 'beer', label: 'Good mood? Make it a round.' },
  { id: 'alcopop', label: 'Keep the party going!' },
]

export function Intro() {
  return (
    <Container size="lg" className={classes.page}>
      <Stack gap={72}>
        <div className={classes.hero}>
          <Stack gap="lg">
            <Title order={1} className={classes.title}>
              A camera reads your face. The ads change to match.
            </Title>
            <Text className={classes.lead}>
              This site is a working demonstration of facial categorisation in advertising. It shows
              what a model guesses about you from a single webcam frame, and what an advertiser
              could do with that guess.
            </Text>
            <Group>
              <Button component={Link} to="/demo" size="lg">
                Try the demo
              </Button>
              <Button component={Link} to="/theory" size="lg" variant="default">
                Read how it works
              </Button>
            </Group>
          </Stack>

          <figure className={classes.example} aria-label="Example reading">
            <Readout attributes={exampleReading} />
            <div className={classes.exampleAds}>
              {exampleAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
            <figcaption className={classes.caption}>
              {targetingReason('16-17', 'up')} Read a few months older, the same face gets tobacco
              and gambling.
            </figcaption>
          </figure>
        </div>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            What this is
          </Title>
          <Text className={classes.prose}>
            Facial recognition systems match a face in an image or video frame against a database of
            faces. By locating and measuring facial features, they can confirm who someone is. A
            related family of systems asks a different question: not who you are, but what you are.
            Facial attribute classification sorts a face into categories, such as an age, a gender,
            an emotion, or whether there is a beard or a hat.
          </Text>
          <Text className={classes.prose}>
            The demo on this site does the second thing. It runs deep learning models, trained on
            large sets of labelled faces, on frames from your webcam, and shows you both the result
            and what follows from it.
          </Text>
        </Stack>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            Why we built it
          </Title>
          <Text className={classes.prose}>
            The aim is to explain what facial recognition technologies are, how they work, where
            they are already in use, and where the dangers lie. Those dangers have been raised by
            several non-governmental organisations; here you can meet them first-hand.
          </Text>
          <Text className={classes.prose}>
            The site does this by showing the technology in action first, and explaining the science
            behind it afterwards.
          </Text>
        </Stack>

        <Stack gap="lg">
          <Title order={2} className={classes.sectionTitle}>
            How it is built
          </Title>
          <Text className={classes.prose}>
            Each webcam frame goes through five steps, in well under a tenth of a second.
          </Text>
          <ol className={classes.steps} aria-label="Steps">
            <li>
              <span>
                <strong>Your browser captures a frame</strong>, shrinks it to 640 pixels wide and
                sends it to a small Python service.
              </span>
            </li>
            <li>
              <span>
                <strong>YuNet finds the faces.</strong> It is a compact detector from the OpenCV
                model zoo. Only the largest face is analysed further.
              </span>
            </li>
            <li>
              <span>
                <strong>FairFace estimates age, gender and race.</strong> It is a ResNet-34 trained
                on a dataset balanced across seven race groups.
              </span>
            </li>
            <li>
              <span>
                <strong>HSEmotion estimates emotion.</strong> It is an EfficientNet-B2 trained on
                AffectNet.
              </span>
            </li>
            <li>
              <span>
                <strong>The service picks two ads</strong> from the set for the estimated age,
                favouring ones with a slogan written for the mood it read, and answers. The frame is
                analysed in memory and then discarded; nothing is stored.
              </span>
            </li>
          </ol>
          <Group>
            <Button component={Link} to="/demo" size="lg">
              Try the demo
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Container>
  )
}
