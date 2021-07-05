import React from 'react';
import {
  ChakraProvider,
  Box,
  Text,
  Stack,
  Link,
  Image,
  Flex,
  Spacer,
  theme,
  Heading,
  Divider,
  Tag,
} from '@chakra-ui/react';
// import { ColorModeSwitcher } from './ColorModeSwitcher';
import prof_pic from './prof_pic.jpeg';
import virus from './Virus512.png';
import {
  FaGithub,
  FaInstagram,
  FaBehance,
  FaLinkedinIn,
  FaFigma,
} from 'react-icons/fa';
import { RiMailLine } from 'react-icons/ri';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" p={3} bg="blue.50">
        {/* <ColorModeSwitcher /> */}
        <Flex alignItems="center" minH="97vh">
          <Stack
            bg="white"
            shadow="md"
            p={5}
            borderRadius={20}
            mx="auto"
            width={['99%', '98%', '80%', '50%']}
          >
            <Flex pb={2} borderBottom="1px" borderColor="gray.100">
              <Text color="gray.500" fontWeight="semibold">
                MY PROFILE
              </Text>
              <Spacer />
              {/* <ColorModeSwitcher />  */}
            </Flex>
            <Box>
              <Stack
                direction={['column', 'row']}
                spacing={5}
                alignItems="center"
                py={2}
              >
                <Image src={prof_pic} boxSize="150px" borderRadius={100} />
                <Stack
                  direction="column"
                  textAlign={['center', 'left', 'left', 'left']}
                >
                  <Heading as="h1" size="xl" color="gray.800">
                    Vincent Haryadi
                  </Heading>
                  <Text fontSize="md">{`Front-end Developer & UI/UX Designer`}</Text>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Link
                      href="https://www.linkedin.com/in/vincenth19/"
                      target="_blank"
                      bg="blue.100"
                      py={1}
                      px={2}
                      borderRadius={10}
                    >
                      <Text fontSize="1rem" color="#blue.700">
                        LinkedIn
                      </Text>
                    </Link>
                    <Link
                      bg="blue.100"
                      py={1}
                      px={2}
                      borderRadius={10}
                      href="https://github.com/vincenth19"
                      target="_blank"
                    >
                      <Text fontSize="1rem" color="#blue.700">
                        GitHub
                      </Text>
                    </Link>
                    <Link
                      href="https://instagram.com/vincenth19"
                      target="_blank"
                      bg="blue.100"
                      py={1}
                      px={2}
                      borderRadius={10}
                    >
                      <Text fontSize="1rem" color="#blue.700">
                        Instagram
                      </Text>
                    </Link>
                    <Link
                      bg="blue.100"
                      py={1}
                      px={2}
                      borderRadius={10}
                      href="mailto:vincenthary19@gmail.com"
                      target="_blank"
                    >
                      <Text fontSize="1rem" color="blue.700">
                        Email
                      </Text>
                    </Link>
                    <Link
                      bg="blue.100"
                      py={1}
                      px={2}
                      borderRadius={10}
                      href="https://www.behance.net/vincentharyadi"
                      target="_blank"
                    >
                      <Text fontSize="1rem" color="blue.700">
                        Behance
                      </Text>
                    </Link>
                  </Stack>
                </Stack>
              </Stack>
              <Stack spacing={5} mt={[0, 5]}>
                <Text
                  pb={2}
                  borderBottom="1px"
                  borderColor="gray.100"
                  color="gray.500"
                  fontWeight="semibold"
                >
                  MY PROJECTS
                </Text>
                <Link href="https://covidtracker.pages.dev" target="_blank">
                  <Box
                    border="1px"
                    borderColor="gray.300"
                    p={5}
                    borderRadius={10}
                  >
                    <Stack direction="row" spacing={5}>
                      <Image src={virus} boxSize="70px" borderRadius={100} />
                      <Stack>
                        <Text fontWeight="bold" fontSize="1.2rem">
                          CovidTracker
                        </Text>
                        <Stack direction="row">
                          <Tag>ReactJS</Tag>
                          <Tag>Chakra UI</Tag>
                        </Stack>
                        <Text>Simple COVID-19 dashboard for Indonesia</Text>
                      </Stack>
                    </Stack>
                  </Box>
                </Link>
                <Link
                  href="https://www.figma.com/file/k9KnpIAi7BoJqOQAXfR90X/Reminder-2.0?node-id=0%3A1"
                  target="_blank"
                >
                  <Box
                    border="1px"
                    borderColor="gray.300"
                    p={5}
                    borderRadius={10}
                  >
                    <Stack direction="row" spacing={5}>
                      <Box fontSize="70px" color="#A359FF">
                        <FaFigma />
                      </Box>
                      <Stack>
                        <Text fontWeight="bold" fontSize="1.2rem">
                          Mask Reminder App Design
                        </Text>
                        <Stack direction="row">
                          <Tag>Figma</Tag>
                          <Tag>UI/UX</Tag>
                        </Stack>
                        <Text>
                          Mobile application design that is used to remind user
                          to wear mask.
                        </Text>
                      </Stack>
                    </Stack>
                  </Box>
                </Link>
              </Stack>
            </Box>
          </Stack>
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default App;
