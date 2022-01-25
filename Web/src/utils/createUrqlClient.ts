import { cacheExchange, Resolver, Cache } from "@urql/exchange-graphcache";
import {
    dedupExchange,
    Exchange,
    fetchExchange,
    stringifyVariables,
} from "urql";
import { pipe, tap } from "wonka";
import {
    DeletePostMutationVariables,
    LoginMutation,
    LogoutMutation,
    MeDocument,
    MeQuery,
    RegisterMutation,
    VoteMutationVariables,
} from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import Router from "next/router";
import gql from "graphql-tag";
import { isServer } from "./isServer";

// everytime there is an error in anything we run, the code is gonna go here
const errorExchange: Exchange =
    ({ forward }) =>
    (ops$) => {
        return pipe(
            forward(ops$),
            tap(({ error }) => {
                // If the OperationResult has an error send a request to sentry
                if (error) {
                    // the error is a CombinedError with networkError and graphqlErrors properties
                    if (error?.message.includes("not authenticated")) {
                        Router.replace("/login"); //redirect
                    }
                }
            })
        );
    };

//code modified from urql/simplepagination github
//function returns a resolver type
const cursorPagination = (): Resolver => {
    return (_parent, fieldArgs, cache, info) => {
        const { parentKey: entityKey, fieldName } = info;
        const allFields = cache.inspectFields(entityKey);
        const fieldInfos = allFields.filter(
            (info) => info.fieldName === fieldName
        );
        const size = fieldInfos.length;
        if (size === 0) {
            //no data is returned (cache miss), return undefined
            return undefined;
        }

        // if we return results, that means we found data in the cache
        // so we need to tell urql when to do a query
        // info.partial will make urql think we didn't give it ALL the data and it will make a query for
        // the data from the server
        const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
        const isItInTheCache = cache.resolve(
            cache.resolve(entityKey, fieldKey) as string,
            "posts"
        );
        // console.log("isItInTheCache", isItInTheCache);
        info.partial = !isItInTheCache; //! casts DatField to boolean as well as negates it

        // check if the data is in the cache (read it), return data from cache
        // because we could possibly have a lot of fields, we loop
        const results: string[] = [];
        let hasMore = true;
        fieldInfos.forEach((fi) => {
            const key = cache.resolve(entityKey, fi.fieldKey) as string;
            const data = cache.resolve(key, "posts") as string[];
            const _hasMore = cache.resolve(key, "hasMore");
            if (!_hasMore) {
                hasMore = _hasMore as boolean;
            }
            results.push(...data);
        });

        return {
            __typename: "PaginatedPosts",
            hasMore,
            posts: results,
        };
    };
};

function invalidateAllPosts(cache: Cache) {
    const allFields = cache.inspectFields("Query");
    const fieldInfos = allFields.filter((info) => info.fieldName === "posts");
    // looping through all paginated queries and invalidate all of them,
    // so that they are refected from the cache on page load
    fieldInfos.forEach((fi) => {
        cache.invalidate("Query", "posts", fi.arguments || {});
    });
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => {
    let cookie = "";
    if (isServer()) {
        cookie = ctx?.req?.headers?.cookie;
    }

    return {
        url: "http://localhost:4000/graphql",
        fetchOptions: {
            credentials: "include" as const,
            headers: cookie
                ? {
                      cookie,
                  }
                : undefined,
        },
        exchanges: [
            dedupExchange,
            cacheExchange({
                keys: {
                    PaginatedPosts: () => null,
                },
                resolvers: {
                    Query: {
                        posts: cursorPagination(),
                    },
                },
                updates: {
                    Mutation: {
                        deletePost: (_result, args, cache, info) => {
                            // invalidate a post, cache will refetch data from server
                            cache.invalidate({
                                __typename: "Post",
                                id: (args as DeletePostMutationVariables).id,
                            });
                        },
                        vote: (_result, args, cache, info) => {
                            const { postId, value } =
                                args as VoteMutationVariables;
                            // doesn't matter where post is (we are giving no pagination info),
                            // the post will be updated in cache
                            const data = cache.readFragment(
                                gql`
                                    fragment _ on Post {
                                        id
                                        points
                                        voteStatus
                                    }
                                `,
                                { id: postId } as any
                            );
                            if (data) {
                                if (data.voteStatus === value) {
                                    //if vote status already the value we are trying to change
                                    // with upvote/downvote, don't do anything
                                    return;
                                }
                                const newPoints =
                                    (data.points as number) +
                                    (!data.voteStatus ? 1 : 2) * value; // if we have voted (data.voteStatus is not null), we are switching vote (-2 or +2)
                                cache.writeFragment(
                                    gql`
                                        fragment __ on Post {
                                            points
                                            voteStatus
                                        }
                                    `,
                                    {
                                        id: postId,
                                        points: newPoints,
                                        voteStatus: value,
                                    } as any
                                );
                            }
                        },
                        createPost: (_result, args, cache, info) => {
                            invalidateAllPosts(cache);

                            // createPost is adding a post to the data base
                            // client-side is saying to re-fetch data from cache
                            // the data on the home page will be reloaded and show new posts
                            // cache.invalidate("Query", "posts", {
                            //     limit: 10,
                            // });
                        },
                        logout: (_result, args, cache, info) => {
                            // me query should return null
                            betterUpdateQuery<LogoutMutation, MeQuery>(
                                cache,
                                { query: MeDocument },
                                _result,
                                () => ({ me: null })
                            );
                        },
                        login: (_result, args, cache, info) => {
                            betterUpdateQuery<LoginMutation, MeQuery>(
                                cache,
                                { query: MeDocument },
                                _result,
                                (result, query) => {
                                    // if the me query returns an error
                                    if (result.login.errors) {
                                        return query;
                                    } else {
                                        return {
                                            me: result.login.user,
                                        };
                                    }
                                }
                            );
                            invalidateAllPosts(cache);
                        },

                        register: (_result, args, cache, info) => {
                            betterUpdateQuery<RegisterMutation, MeQuery>(
                                cache,
                                { query: MeDocument },
                                _result,
                                (result, query) => {
                                    // if the me query returns an error
                                    if (result.register.errors) {
                                        return query;
                                    } else {
                                        return {
                                            me: result.register.user,
                                        };
                                    }
                                }
                            );
                        },
                    },
                },
            }),
            errorExchange,
            ssrExchange,
            fetchExchange,
        ],
    };
};
