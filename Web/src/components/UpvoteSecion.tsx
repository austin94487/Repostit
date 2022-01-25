import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Text, useControllableState } from "@chakra-ui/react";
import React, { useState } from "react";
import {
    PostSnippetFragment,
    PostsQuery,
    useVoteMutation,
} from "../generated/graphql";

interface UpvoteSecionProps {
    // Selecting the 'posts' subtype which is an array
    // post: PostsQuery["posts"]["posts"][0];

    // Created a fragment to simply this process (don't have to pass in entire post object. Fragment gives us just
    // the types we want )
    post: PostSnippetFragment;
}

function getTextColor(voteStatus: any) {
    if (voteStatus === 1) {
        return "green";
    } else if (voteStatus === -1) {
        return "red";
    } else {
        return "black";
    }
}

export const UpvoteSecion: React.FC<UpvoteSecionProps> = ({ post }) => {
    const [loadingState, setLoadingState] = useState<
        "upvote-loading" | "downvote-loading" | "not-loading"
    >("not-loading");
    const [, vote] = useVoteMutation();
    return (
        <Flex
            direction="column"
            justifyContent="center"
            alignItems="center"
            mr={4}
        >
            <IconButton
                onClick={async () => {
                    if (post.voteStatus === 1) {
                        // do nothing if you have already upvoted post
                        return;
                    }

                    setLoadingState("upvote-loading");
                    await vote({
                        postId: post.id,
                        value: 1,
                    });
                    setLoadingState("not-loading");
                }}
                isLoading={loadingState === "upvote-loading"}
                //colorScheme={upvoteColorValue}
                colorScheme={post.voteStatus === 1 ? "green" : "gray"}
                aria-label="upvote post"
                icon={<ChevronUpIcon />}
                fontSize="28px"
                // variant={upvoteVariantValue}
                variant={post.voteStatus === 1 ? "solid" : "ghost"}
            />
            <Text color={getTextColor(post.voteStatus as any)}>
                {post.points}
            </Text>
            <IconButton
                onClick={async () => {
                    if (post.voteStatus == -1) {
                        //do nothing if you've already downvoted post
                        return;
                    }
                    setLoadingState("downvote-loading");
                    await vote({
                        postId: post.id,
                        value: -1,
                    });
                    setLoadingState("not-loading");
                }}
                isLoading={loadingState === "downvote-loading"}
                colorScheme={post.voteStatus === -1 ? "red" : "gray"}
                aria-label="downvote post"
                icon={<ChevronDownIcon />}
                fontSize="28px"
                variant={post.voteStatus === -1 ? "solid" : "ghost"}
            />
        </Flex>
    );
};
