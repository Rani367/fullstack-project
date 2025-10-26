import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Link,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { FiArrowRight, FiCheck, FiZap } from "react-icons/fi"

import { isLoggedIn } from "@/hooks/useAuth"
import Logo from "/assets/images/fastapi-logo.svg"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const loggedIn = isLoggedIn()

  return (
    <Box minH="100vh" bg="bg.canvas">
      {/* Navigation */}
      <Flex
        justify="space-between"
        align="center"
        p={6}
        position="sticky"
        top={0}
        zIndex={100}
        bg="bg.canvas"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="border.emphasized"
      >
        <Image src={Logo} alt="Logo" maxW="2xs" />
        <Stack direction="row" spacing={4}>
          {loggedIn ? (
            <Button
              as={Link}
              href="/dashboard"
              rightIcon={<FiArrowRight />}
              variant="solid"
              size="md"
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} href="/login" variant="ghost" size="md">
                Log In
              </Button>
              <Button
                as={Link}
                href="/signup"
                variant="solid"
                size="md"
                rightIcon={<FiArrowRight />}
              >
                Get Started
              </Button>
            </>
          )}
        </Stack>
      </Flex>

      {/* Hero Section */}
      <Container maxW="container.xl" py={20}>
        <VStack spacing={8} textAlign="center">
          <Heading as="h1" size="3xl" lineHeight="1.2">
            Welcome to Our Platform
          </Heading>
          <Text fontSize="xl" color="fg.muted" maxW="2xl">
            A modern, full-stack application built with FastAPI and React.
            Manage your data with ease and experience the power of TypeScript
            and Python combined.
          </Text>
          {!loggedIn && (
            <Stack direction="row" spacing={4} pt={4}>
              <Button
                as={Link}
                href="/signup"
                size="lg"
                variant="solid"
                rightIcon={<FiArrowRight />}
              >
                Get Started
              </Button>
              <Button as={Link} href="/login" size="lg" variant="outline">
                Sign In
              </Button>
            </Stack>
          )}
        </VStack>
      </Container>

      {/* Features Section */}
      <Box bg="bg.subtle" py={20}>
        <Container maxW="container.xl">
          <Heading as="h2" size="2xl" textAlign="center" mb={12}>
            Why Choose Our Platform?
          </Heading>
          <Flex direction={{ base: "column", md: "row" }} gap={8}>
            <FeatureBox
              icon={FiZap}
              title="Lightning Fast"
              description="Built with modern technologies for optimal performance and user experience."
            />
            <FeatureBox
              icon={FiCheck}
              title="Secure by Default"
              description="Enterprise-grade security with JWT authentication and secure password hashing."
            />
            <FeatureBox
              icon={FiZap}
              title="Easy to Use"
              description="Intuitive interface designed for productivity and seamless user experience."
            />
          </Flex>
        </Container>
      </Box>

      {/* CTA Section */}
      {!loggedIn && (
        <Container maxW="container.xl" py={20}>
          <Box
            bg="bg.muted"
            borderRadius="2xl"
            p={12}
            textAlign="center"
            border="1px solid"
            borderColor="border.emphasized"
          >
            <VStack spacing={6}>
              <Heading as="h2" size="xl">
                Ready to Get Started?
              </Heading>
              <Text fontSize="lg" color="fg.muted" maxW="md">
                Join thousands of users who are already managing their data with
                our platform.
              </Text>
              <Stack direction="row" spacing={4} pt={4}>
                <Button
                  as={Link}
                  href="/signup"
                  size="lg"
                  variant="solid"
                  rightIcon={<FiArrowRight />}
                >
                  Create Account
                </Button>
                <Button as={Link} href="/login" size="lg" variant="ghost">
                  I already have an account
                </Button>
              </Stack>
            </VStack>
          </Box>
        </Container>
      )}

      {/* Footer */}
      <Box borderTop="1px solid" borderColor="border.emphasized" py={8}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Text color="fg.muted">© 2024 Full Stack FastAPI Project</Text>
            <Stack direction="row" spacing={6}>
              <Link href="/login" color="fg.muted" _hover={{ color: "fg" }}>
                Terms
              </Link>
              <Link href="/login" color="fg.muted" _hover={{ color: "fg" }}>
                Privacy
              </Link>
            </Stack>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}

function FeatureBox({ icon: Icon, title, description }: any) {
  return (
    <Box flex="1" p={8} bg="bg.canvas" borderRadius="xl" border="1px solid" borderColor="border.emphasized">
      <VStack spacing={4} align="start">
        <Box
          p={3}
          bg="bg.muted"
          borderRadius="lg"
          color="fg.muted"
        >
          <Icon size={24} />
        </Box>
        <Heading as="h3" size="md">
          {title}
        </Heading>
        <Text color="fg.muted">{description}</Text>
      </VStack>
    </Box>
  )
}

export default LandingPage

