// Resolver is a collection of functions that generate response for a GraphQL query. 
// In simple terms, a resolver acts as a GraphQL query handler. 
// Every resolver function in a GraphQL schema accepts four positional arguments as given below − 
// fieldName:(root, args, context, info) => { result }

import { Query, Resolver } from "type-graphql";

// decorator may be optional?
@Resolver()
export class HelloResolver {
    // have to declare what the query returns in GraphQL
    @Query(() => String)
    hello() {
        return "bye"
    }
}
