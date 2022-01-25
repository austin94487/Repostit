import { Cache, QueryInput } from "@urql/exchange-graphcache";

//helper function to make it easy to cast desired types
export function betterUpdateQuery<Result, Query>(
    cache: Cache,
    qi: QueryInput,
    result: any,
    fn: (r: Result, q: Query) => Query
) {
    return cache.updateQuery(qi, (data) => fn(result, data as any) as any);
}
