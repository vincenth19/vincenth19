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
  SimpleGrid,
  Divider
} from '@chakra-ui/react';
import { ColorModeSwitcher } from './ColorModeSwitcher';
import prof_pic from './prof_pic.jpeg'
import virus from './Virus512.png'
import {FaGithub, FaInstagram, FaBehance, FaLinkedinIn, FaFigma} from 'react-icons/fa'
import {RiMailLine} from 'react-icons/ri'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" p={3} bg="blue.50">
        {/* <ColorModeSwitcher /> */}
        <Flex alignItems="center" minH="97vh">
          <Stack bg="white" shadow="md" p={5} borderRadius={20} mx="auto" width={["99%", "98%", "80%", "50%"]} >
            <Flex>
              <Text color="gray.500" fontWeight="semibold">MY PROFILE</Text>
              <Spacer/>
              {/* <ColorModeSwitcher />  */}
            </Flex>
            <Box>
              <Divider/>
              <Stack direction={["column", "row"]} my={5} spacing={5} alignItems="center">
                <Image src={prof_pic} boxSize="150px" borderRadius={100}/>
                <Stack direction='column' textAlign={["center", "left", "left", "left"]}>
                  <Heading as="h1" size="xl" color="gray.800">Vincent Haryadi</Heading>
                  <Text fontSize="md">{`Front-end Developer & UI/UX Designer`}</Text>
                  <Stack direction="row" spacing={5}>
                    <Link href="https://www.linkedin.com/in/vincenth19/" target="_blank">
                      <Text fontSize="2rem" color="#2466C3"><FaLinkedinIn/></Text>
                    </Link>
                    <Link href="https://github.com/vincenth19" target="_blank">
                      <Text fontSize="2rem" color="#0D1117"><FaGithub/></Text>
                    </Link>
                    <Link href="https://instagram.com/vincenth19" target="_blank">
                      <Text fontSize="2rem" color="#000000"><FaInstagram/></Text>
                    </Link>
                    <Link href="mailto:vincenthary19@gmail.com" target="_blank">
                      <Text fontSize="2rem" color="gray.700"><RiMailLine/></Text>
                    </Link>
                    <Link href="https://www.behance.net/vincentharyadi" target="_blank">
                      <Text fontSize="2rem" color="#2857FF"><FaBehance/></Text>
                    </Link>
                  </Stack>
                </Stack>
              </Stack>
              <Divider/>
              <Stack spacing={5} mt={[0,5]}>
                <Heading as="h2" size="md" color="gray.700">My Projects</Heading>
                <Link href="https://covidtracker.pages.dev" target="_blank">
                  <Box border="1px" borderColor="gray.300" p={5} borderRadius={10}>
                    <Stack direction="row" spacing={5}>
                      <Image src={virus} boxSize="70px" borderRadius={100}/>
                      <Stack>
                        <Text fontWeight="bold" fontSize="1.2rem">CovidTracker</Text>
                        <Text>Simple COVID-19 dashboard for Indonesia</Text>
                      </Stack>
                    </Stack>
                  </Box>
                </Link>
                <Link href="https://www.figma.com/file/k9KnpIAi7BoJqOQAXfR90X/Reminder-2.0?node-id=0%3A1" target="_blank">
                  <Box border="1px" borderColor="gray.300" p={5} borderRadius={10}>
                    <Stack direction="row" spacing={5}>
                      <Text fontSize="3.6em" color="#A359FF"><FaFigma/></Text>
                      <Stack>
                        <Text fontWeight="bold" fontSize="1.2rem">Mask Reminder App Design</Text>
                        <Text>Mobile application design that is used to remind user to wear mask.</Text>
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
