import React from "react";
import { Form, Formik } from "formik";
import { Box, Button, Link } from "@chakra-ui/react";
import { Wrapper } from "../components/Wrapper";
import { InputField } from "../components/InputField";
import { useLoginMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import NextLink from "next/link";

const Login: React.FC<{}> = ({}) => {
    // use Next.js router
    const router = useRouter();
    const [, login] = useLoginMutation();
    return (
        <Wrapper variant="small">
            <Formik
                initialValues={{ usernameOrEmail: "", password: "" }}
                onSubmit={async (values, { setErrors }) => {
                    const response = await login(values);
                    if (response.data?.login.errors) {
                        setErrors(toErrorMap(response.data.login.errors));
                    } else if (response.data?.login.user) {
                        if (typeof router.query.next === "string") {
                            // if there is a query parameter in the router object, route to that page
                            router.push(router.query.next);
                        }
                        // registration worked -> navigate to landing page
                        router.push("/"); // back to home page
                    }
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <InputField
                            name="usernameOrEmail"
                            placeholder="username or email"
                            label="Username or Email"
                        />
                        <Box mt={4}>
                            <InputField
                                name="password"
                                placeholder="password"
                                label="Password"
                                type="password"
                            />
                        </Box>
                        <Box>
                            <NextLink href="/forgot-password">
                                <Link>forgot password?</Link>
                            </NextLink>
                        </Box>
                        <Button
                            mt={4}
                            type="submit"
                            isLoading={isSubmitting}
                            colorScheme="blue"
                        >
                            login
                        </Button>
                    </Form>
                )}
            </Formik>
        </Wrapper>
    );
};

//Are we doing an querying? Is the data we are querying good SEO?
// then you gotta wrap with this function withUrqlClient
export default withUrqlClient(createUrqlClient)(Login);
