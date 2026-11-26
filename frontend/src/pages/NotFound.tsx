import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import classes from './pages.module.css'

export function NotFound() {
  return (
    <Container size="lg" className={classes.page}>
      <Stack gap="md">
        <Title order={1} className={classes.title}>
          Page not found
        </Title>
        <Text className={classes.lead}>There is nothing at this address.</Text>
        <Anchor component={Link} to="/">
          Back to the introduction
        </Anchor>
      </Stack>
    </Container>
  )
}
