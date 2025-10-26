import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, Link as RouterLink } from "@tanstack/react-router"
import { FiArrowRight, FiCheck, FiZap } from "react-icons/fi"

import { isLoggedIn } from "@/hooks/useAuth"

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
        <RouterLink to="/"><Text fontSize="xl" fontWeight="bold">Platform</Text></RouterLink>
        <Flex gap={4}>
          {loggedIn ? (
            <RouterLink to="/dashboard">
              <Button variant="solid" size="md">
                Go to Dashboard <FiArrowRight />
              </Button>
            </RouterLink>
          ) : (
            <>
              <RouterLink to="/login">
                <Button variant="ghost" size="md">Log In</Button>
              </RouterLink>
              <RouterLink to="/signup">
                <Button variant="solid" size="md">
                  Get Started <FiArrowRight />
                </Button>
              </RouterLink>
            </>
          )}
        </Flex>
      </Flex>

      {/* Hero Section */}
      <Container maxW="container.xl" py={20}>
        <VStack gap={8} textAlign="center">
          <Heading as="h1" size="3xl" lineHeight="1.2">
            Welcome to Our Platform
          </Heading>
          <Text fontSize="xl" color="fg.muted" maxW="2xl">
            A modern, full-stack application built with FastAPI and React.
            Manage your data with ease and experience the power of TypeScript
            and Python combined.
          </Text>
          {!loggedIn && (
            <Flex direction="row" gap={4} pt={4}>
              <RouterLink to="/signup">
                <Button size="lg" variant="solid">
                  Get Started <FiArrowRight />
                </Button>
              </RouterLink>
              <RouterLink to="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </RouterLink>
            </Flex>
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
            <VStack gap={6}>
              <Heading as="h2" size="xl">
                Ready to Get Started?
              </Heading>
              <Text fontSize="lg" color="fg.muted" maxW="md">
                Join thousands of users who are already managing their data with
                our platform.
              </Text>
              <Flex direction="row" gap={4} pt={4}>
                <RouterLink to="/signup">
                  <Button size="lg" variant="solid">
                    Create Account <FiArrowRight />
                  </Button>
                </RouterLink>
                <RouterLink to="/login">
                  <Button size="lg" variant="ghost">
                    I already have an account
                  </Button>
                </RouterLink>
              </Flex>
            </VStack>
          </Box>
        </Container>
      )}

      {/* Footer */}
      <Box borderTop="1px solid" borderColor="border.emphasized" py={8}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Text color="fg.muted">© 2024 Full Stack FastAPI Project</Text>
            <Flex direction="row" gap={6}>
              <RouterLink to="/login">
                <Link color="fg.muted" _hover={{ color: "fg" }}>
                  Terms
                </Link>
              </RouterLink>
              <RouterLink to="/login">
                <Link color="fg.muted" _hover={{ color: "fg" }}>
                  Privacy
                </Link>
              </RouterLink>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}

function FeatureBox({ icon: Icon, title, description }: any) {
  return (
    <Box flex="1" p={8} bg="bg.canvas" borderRadius="xl" border="1px solid" borderColor="border.emphasized">
      <VStack gap={4} align="start">
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

