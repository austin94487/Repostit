import { Box, Link, Flex, Button, Heading } from "@chakra-ui/react";
import NextLink from "next/link"; // will use client-side routing (important)
import React from "react";
import { useLogoutMutation, useMeQuery } from "../generated/graphql";
import { isServer } from "../utils/isServer";
import { useRouter } from "next/router";

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
    const router = useRouter();
    const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
    const [{ data, fetching }] = useMeQuery({
        pause: isServer(),
    });
    let body = null;

    // 3 states: fetching, logged in, not logged in
    // data is loading
    if (fetching) {
        body = null;
    } else if (!data?.me) {
        //user not logged in
        body = (
            <>
                <NextLink href="/login">
                    <Link mr={2}>login</Link>
                </NextLink>
                <NextLink href="/register">
                    <Link mr={2}>register</Link>
                </NextLink>
            </>
        );
    } else {
        //user is logged in
        body = (
            <Flex align="center">
                <NextLink href="/create-post">
                    <Button as={Link} mr={4}>
                        create post
                    </Button>
                </NextLink>
                <Box mr={2}>{data.me.username}</Box>
                <Button
                    onClick={async () => {
                        await logout();
                        // reloads homepage so that
                        router.reload();
                    }}
                    isLoading={logoutFetching}
                    variant="link"
                >
                    logout
                </Button>
            </Flex>
        );
    }

    return (
        <Flex zIndex={1} position="sticky" top={0} bg="tan" p={4}>
            <Flex flex={1} m="auto" maxW={800} align="center">
                <NextLink href="/">
                    <Link>
                        <Heading size="lg">Repostit</Heading>
                    </Link>
                </NextLink>
                <Box ml={"auto"}>{body}</Box>
            </Flex>
        </Flex>
    );
};
