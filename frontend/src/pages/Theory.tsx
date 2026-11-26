import { Button, Container, Group, Stack, Table, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import {
  AlignmentPictogram,
  DetectionPictogram,
  FaceScan,
  RepresentationPictogram,
  VerificationPictogram,
} from './figures'
import classes from './pages.module.css'

const stages = [
  {
    name: 'Detection',
    Pictogram: DetectionPictogram,
    text: 'The program looks for a face in the image.',
  },
  {
    name: 'Alignment',
    Pictogram: AlignmentPictogram,
    text: 'A face that was found is straightened, so that a tilted head does not cause a wrong result.',
  },
  {
    name: 'Representation',
    Pictogram: RepresentationPictogram,
    text: 'The aligned face now resembles the training data, and is turned into a vector of numbers.',
  },
  {
    name: 'Verification',
    Pictogram: VerificationPictogram,
    text: 'The model returns the categories that vector falls into.',
  },
]

// Measured on 600 labelled photos per test set while choosing the models; see the README.
const accuracy = [
  { question: 'Gender', right: '93 in 100' },
  { question: 'Age, to the right ten-year range', right: '58 in 100' },
  { question: 'Age, to the right side of eighteen', right: '97 in 100' },
  { question: 'Race, out of seven groups', right: '70 in 100' },
]

export function Theory() {
  return (
    <Container size="lg" className={classes.page}>
      <Stack gap={72}>
        <div className={classes.hero}>
          <Stack gap="lg">
            <Title order={1} className={classes.title}>
              How a machine sorts faces
            </Title>
            <Text className={classes.lead}>
              In the narrow sense, facial recognition technology analyses the features of a face in
              order to identify or classify it. In the broad sense, every operation on a face in an
              image, from detection to preprocessing, counts.
            </Text>
            <Text className={classes.prose}>
              Classification is one kind of facial recognition technology. It sorts a face into
              categories. For emotion, it decides whether a person is happy, sad, angry, surprised,
              disgusted or neutral. For personality, some systems try to predict openness,
              conscientiousness, extroversion, agreeableness and neuroticism. For age, it predicts a
              number from a photo.
            </Text>
          </Stack>
          <FaceScan className={classes.faceScan} />
        </div>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            Training
          </Title>
          <Text className={classes.prose}>
            A model is given data with labels and tries to work out the relation between the two.
            Shown a picture of a man's face and the label “angry”, it looks for the mathematical
            relation between the pixels and that label.
          </Text>
          <Text className={classes.prose}>
            The amount of data is usually in the tens of thousands of images, or more. The more
            correctly labelled data a model trains on, the more accurate it can be. If the dataset
            is too small, under-represents some groups of people, or contains many mislabelled
            examples, the trained model will be faulty.
          </Text>
        </Stack>

        <Stack gap="lg">
          <Title order={2} className={classes.sectionTitle}>
            Inference
          </Title>
          <Text className={classes.prose}>
            Once trained, the model can classify images it has never seen. Most systems do this in
            four stages.
          </Text>
          <ol className={classes.stages} aria-label="Inference stages">
            {stages.map(({ name, Pictogram, text }) => (
              <li key={name}>
                <Pictogram className={classes.pictogram} />
                <h3>{name}</h3>
                {text}
              </li>
            ))}
          </ol>
        </Stack>

        <Stack gap="lg">
          <Title order={2} className={classes.sectionTitle}>
            Where it is used
          </Title>
          <dl className={classes.uses}>
            <div>
              <dt>Law enforcement</dt>
              <dd>
                Police can deploy the technology in a city's surveillance system to keep an eye on
                people they consider potential criminals.
              </dd>
            </div>
            <div>
              <dt>Hiring</dt>
              <dd>
                Human resources departments in large companies could use a personality classifier to
                filter applicants, keeping those judged to fit the company culture for the next
                round and saving the work of reading every profile.
              </dd>
            </div>
            <div>
              <dt>Advertising</dt>
              <dd>
                “Smart retail” systems could track a customer's emotion and age to infer what they
                like, and promote matching merchandise to them.
              </dd>
            </div>
          </dl>
          <Text className={classes.warning}>
            These applications are recent, and some are not yet properly regulated by law. Where
            that is so, harm can follow and human rights can be violated. Advertising in smart
            retail, the subject of the demo, is a case in point.
          </Text>
        </Stack>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            The problem with recommendations
          </Title>
          <Text className={classes.prose}>
            Facial classification is often described as highly accurate, but it makes mistakes. When
            a face is misclassified, the system shows the wrong advertisement. A boy who looks older
            than he is could be classified as an adult and shown advertisements for alcohol and
            vapes.
          </Text>
          <Text className={classes.prose}>
            The system stays controversial even if the model were right every time. The merchandise
            gets promoted and the company profits. For the consumer, repeated exposure to the same
            advertising, aimed at the same group, narrows what people see. If smart retail becomes
            common, there is no retreat from the gathering of knowledge about customers. Seeing an
            advertisement for a harmful habit again and again, perhaps with a message tailored to a
            person, their tastes and their current mood, could lead them to take the habit up.
          </Text>
        </Stack>

        <Stack gap="md">
          <Title order={2} className={classes.sectionTitle}>
            How often this demo is right
          </Title>
          <Text className={classes.prose}>
            The models behind the demo were chosen by testing several candidates on photos whose
            answers are known. These were the best available, and this is how they scored.
          </Text>
          <Table maw="38rem" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>What the model guesses</Table.Th>
                <Table.Th ta="right">Faces it gets right</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accuracy.map(({ question, right }) => (
                <Table.Tr key={question}>
                  <Table.Td>{question}</Table.Td>
                  <Table.Td ta="right">{right}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Text className={classes.prose}>
            Emotion is the least reliable of all. Asked for one of seven emotions, the model is
            right for about 56 faces in 100. The demo therefore only says whether you look happy,
            sad or worried, angry or tense, or neutral, which it gets right for about 66 in 100. It
            is far better at smiles than at anything else: a face it calls happy is happy four times
            in five, and a face it calls angry is angry about half the time. An advertiser acting on
            these guesses is wrong about a great many people, and the people are never told.
          </Text>
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
