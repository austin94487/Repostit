import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { Box, IconButton, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import internal from "stream";
import { useDeletePostMutation, useMeQuery } from "../generated/graphql";

interface EditDeletePostButtonsProps {
    id: number;
    creatorId: number;
    top: number;
    right: number;
}

export const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({
    id,
    creatorId,
    top,
    right,
}) => {
    const [{ data: meData }] = useMeQuery();
    const [, deletePost] = useDeletePostMutation();

    if (meData?.me?.id !== creatorId) {
        return null;
    }

    return (
        <Box position="relative">
            <NextLink href="/post/edit/[id]" as={`/post/edit/${id}`}>
                <IconButton
                    position="absolute"
                    as={Link}
                    top={top}
                    right={right + 12}
                    aria-label="Edit post"
                    icon={<EditIcon />}
                ></IconButton>
            </NextLink>
            <IconButton
                position="absolute"
                top={top}
                right={right}
                onClick={() => {
                    deletePost({ id });
                }}
                aria-label="Delete post"
                icon={<DeleteIcon />}
            ></IconButton>
        </Box>
    );
};
