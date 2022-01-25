// Resolver is a collection of functions that generate response for a GraphQL query.
// In simple terms, a resolver acts as a GraphQL query handler.
// Every resolver function in a GraphQL schema accepts four positional arguments as given below −
// fieldName:(root, args, context, info) => { result }

import { MyContext } from "src/types";
import {
    Arg,
    Ctx,
    Field,
    FieldResolver,
    InputType,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    Root,
    UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Post } from "../entities/Post";
import { Upvote } from "../entities/Upvote";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";

@InputType()
class PostInput {
    @Field()
    title: string;
    @Field()
    text: string;
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[];
    @Field()
    hasMore: boolean;
}

// decorator may be optional?
@Resolver(Post)
export default class PostResolver {
    // This just creates a snippet of the post text, so we aren't loading all the data for a
    // potentionally huge post on front-end
    @FieldResolver(() => String)
    textSnippet(
        //will be called everytime we get a post object
        @Root() root: Post
    ) {
        if (root.text.length > 100) {
            return root.text.slice(0, 90) + "...";
        } else {
            return root.text;
        }
    }

    @FieldResolver(() => User)
    creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
        // n+1 problem. If you had 100 posts, there would be 100 sql requests (which is bad for performance!)
        // fetches user no matter where the post is coming from, a sql request will be sent to fetch creator
        // return User.findOne(post.creatorId);

        // batches all ids into single function call
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(
        @Root() post: Post,
        @Ctx() { upvoteLoader, req }: MyContext
    ) {
        if (!req.session.userId) {
            //if they aren't logged in, we don't need to do a query
            // we already know they don't have a vote status for any posts
            return null;
        }
        const upvote = await upvoteLoader.load({
            postId: post.id,
            userId: req.session.userId,
        });

        return upvote ? upvote.value : null;
    }

    @Mutation(() => Boolean)
    // isAuth middleware to protect this route
    @UseMiddleware(isAuth)
    async vote(
        @Arg("postId", () => Int) postId: number,
        @Arg("value", () => Int) value: number,
        @Ctx() { req }: MyContext
    ) {
        const isUpvote = value !== -1;
        const realValue = isUpvote ? 1 : -1;
        const { userId } = req.session;

        const upvote = await Upvote.findOne({ where: { postId, userId } });
        // 3 possible states
        if (upvote && upvote.value !== realValue) {
            // user has voted on the post before and they are changing their vote
            await getConnection().transaction(async (tm) => {
                // we don't have to insert into table, just update table with realValue
                await tm.query(
                    `
                update upvote 
                set value = $1
                where "postId" = $2 and "userId" = $3
                `,
                    [realValue, postId, userId]
                );

                await tm.query(
                    ` 
                    update post 
                    set points = points + $1
                    where id = $2
                `,
                    [2 * realValue, postId]
                );
            });
        } else if (!upvote) {
            // they have never voted on the post before

            //using this typeorm will automatically handle opening/closing of
            // transactions using this .transaction function
            await getConnection().transaction(async (tm) => {
                await tm.query(
                    `
        insert into upvote ("userId", "postId", value)
        values ($1, $2, $3);
                `,
                    [userId, postId, realValue]
                );
                await tm.query(
                    ` 
        update post 
        set points = points + $1
        where id = $2
                `,
                    [realValue, postId]
                );
            });
        }
        return true;
    }

    // Queries are for getting data
    // have to declare what the query returns in GraphQL
    @Query(() => PaginatedPosts) // set GraphQL type
    async posts(
        // cursor based pagination
        // we're going to sort by new
        @Arg("limit", () => Int) limit: number,
        @Arg("cursor", () => String, { nullable: true }) cursor: string | null //when something is nullable, explicitly set type
    ): Promise<PaginatedPosts> {
        // if they give us a limit > 50, we cap at 50 so they can't pull entire database
        // If user asks for 20 posts, we try to fetch up to 21 posts
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;

        const replacements: any[] = [realLimitPlusOne];

        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }

        const posts = await getConnection().query(
            `
            select p.*
            from post p
            ${cursor ? `where p."createdAt" < $2` : ""}
            order by p."createdAt" DESC
            limit $1
        `,
            replacements
        );

        // const qb = getConnection()
        //     .getRepository(Post)
        //     .createQueryBuilder("p")
        //     .innerJoinAndSelect(
        //         "p.creator",
        //         "u", //second arg is alias
        //         '"u.id = p."creatorId"'
        //     )
        //     .orderBy('p."createdAt"', "DESC")
        //     .take(realLimitPlusOne);
        // if (cursor) {
        //     qb.where('p."createdAt" < :cursor', {
        //         cursor: new Date(parseInt(cursor)),
        //     });
        // }

        //getMany actually executes sql, should be last command
        // const posts = await qb.getMany();

        // we slice so we only give the user the realLimit amount
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne, // then we are checking if we have more posts
        };
    }

    @Query(() => Post, { nullable: true }) // set GraphQL type
    post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
        //set typescript type of (Post or null)
        // typeorm will join the creator field in our request with the relations param.
        return Post.findOne(id);
    }

    //Mutations are for updating, inserting or deleting
    @Mutation(() => Post) // set GraphQL type
    @UseMiddleware(isAuth)
    async createPost(
        // not neccessary to explicity define type of argument, it can usually be inferred.
        @Arg("input") input: PostInput,
        @Ctx() { req }: MyContext
    ): Promise<Post> {
        //set typescript type of (Post)
        // 2 sql queries -> 1 to insert, 1 to select (not exactly ideal)
        return Post.create({
            ...input,
            creatorId: req.session.userId,
        }).save();
    }

    @Mutation(() => Post, { nullable: true }) // set GraphQL type
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id", () => Int) id: number,
        @Arg("title") title: string, // maybe you don't want to force all fields to be updated, make full nullable
        @Arg("text") text: string,
        @Ctx() { req }: MyContext
    ): Promise<Post | null> {
        const result = await getConnection()
            .createQueryBuilder()
            .update(Post)
            .set({ title, text })
            .where('id = :id and "creatorId" = :creatorId', {
                id,
                creatorId: req.session.userId,
            })
            .returning("*")
            .execute();
        return result.raw[0];
    }

    @Mutation(() => Boolean) // whether the deletion was succesful
    @UseMiddleware(isAuth) // can't delete unless logged in
    async deletePost(
        // not neccessary to explicity define type of argument, it can usually be inferred.
        @Arg("id", () => Int) id: number, // number is by default a float, tell graphql its an int with () => Int
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        // no cascade way
        // // because our upvote table is connected to our post table, we need to delete the data in the upvote
        // // table before deletion of post
        // const post = await Post.findOne(id);
        // if (!post) {
        //     // no post
        //     return false;
        // }
        // if (post?.creatorId !== req.session.userId) {
        //     //if its not the current user they dont have permission
        //     throw new Error("not authoried");
        // }

        // // delete any upvotes on post before deleting post
        // await Upvote.delete({ postId: id });
        // await Post.delete({ id })

        // will safely only delete posts that the user is the owner of
        await Post.delete({ id, creatorId: req.session.userId });
        return true;
    }
}
