import DataLoader from "dataloader";
import { Upvote } from "../entities/Upvote";

// difference between this upvote loader and the user loader is for this loader we need to know the
// postId and the userId, so the keys are going to be objects
export const createUpvoteLoader = () =>
    new DataLoader<{ postId: number; userId: number }, Upvote | null>(
        async (keys) => {
            // get all users in 1 sql query
            const upvotes = await Upvote.findByIds(keys as any);

            const upvoteIdsToUpvote: Record<string, Upvote> = {};
            upvotes.forEach((upvote) => {
                upvoteIdsToUpvote[`${upvote.userId}|${upvote.postId}`] = upvote;
            });

            //returns array of upvote objects in desired shape
            return keys.map(
                (key) => upvoteIdsToUpvote[`${key.userId}|${key.postId}`]
            );
        }
    );
