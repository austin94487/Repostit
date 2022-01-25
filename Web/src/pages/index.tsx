import {
    Box,
    Button,
    Flex,
    Heading,
    Link,
    Stack,
    Text,
    useControllableState,
} from "@chakra-ui/react";
import { withUrqlClient } from "next-urql";
import NextLink from "next/link";
import React, { useState } from "react";
import { EditDeletePostButtons } from "../components/EditDeletePostButtons";
import { Layout } from "../components/Layout";
import { UpvoteSecion } from "../components/UpvoteSecion";
import { useMeQuery, usePostsQuery } from "../generated/graphql";
import { createUrqlClient } from "../utils/createUrqlClient";

const Index = () => {
    const [variables, setVariables] = useState({
        limit: 10, //NUMBER OF POSTS TO BE RETRIEVED EACH 'LOAD BUTTON' CLICK
        cursor: null as null | string,
    });

    // possibly use this to change the posts on home page to indicate which posts belong to the user
    // (outline stack or highlight posted by text)
    const [{ data: meData }] = useMeQuery();

    const [{ data, error, fetching }] = usePostsQuery({
        variables,
    });

    // const [, deletePost] = useDeletePostMutation();

    // console.log(variables);

    // Something went wrong (possible network issue)
    if (!fetching && !data) {
        return (
            <div>
                <div>you got query failed for some unforseen reason</div>
                <div>{error?.message}</div>
            </div>
        );
    }

    return (
        <Layout>
            {!data && fetching ? (
                <div>loading...</div>
            ) : (
                <Stack spacing={8}>
                    {
                        //! means we KNOW its defined -> it can't be undefined
                        // when we delete posts, we invalidate them and therefore they might appear as null
                        // so we have to handle if the post is null -> return null
                        data!.posts.posts.map((p) =>
                            !p ? null : (
                                <Flex
                                    key={p.id}
                                    p={5}
                                    shadow="md"
                                    borderWidth="1px"
                                >
                                    <UpvoteSecion post={p} />
                                    <Box flex={1}>
                                        <Box ml="auto">
                                            <EditDeletePostButtons
                                                id={p.id}
                                                creatorId={p.creator.id}
                                                top={0}
                                                right={0}
                                            ></EditDeletePostButtons>
                                        </Box>
                                        <NextLink
                                            href="/post/[id]"
                                            as={`/post/${p.id}`}
                                        >
                                            <Link>
                                                <Heading fontSize="xl">
                                                    {p.title}
                                                </Heading>
                                            </Link>
                                        </NextLink>
                                        <Text>
                                            posted by {p.creator.username}
                                        </Text>
                                        <Text mt={4}>{p.textSnippet}</Text>
                                    </Box>
                                </Flex>
                            )
                        )
                    }
                </Stack>
            )}
            {data && data.posts.hasMore ? (
                <Flex>
                    <Button
                        onClick={() => {
                            setVariables({
                                limit: variables.limit,
                                cursor: data.posts.posts[
                                    data.posts.posts.length - 1
                                ].createdAt,
                            });
                        }}
                        isLoading={fetching}
                        m="auto"
                        my={8}
                    >
                        load more
                    </Button>
                </Flex>
            ) : null}
        </Layout>
    );
};

// SSR: SERVER-SIDE-RENDERING
// SSR can be toggled on and off
// When you want dynamic data to have good SEO (search engine optimization) or when you want something to
// be searched on google, server-side render it.
export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
