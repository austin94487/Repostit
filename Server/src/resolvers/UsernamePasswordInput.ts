import { InputType, Field } from "type-graphql";

//instead of user @Arg, you can use input types
// so instead of having multiple args, you can just have an object that gets passed in

@InputType()
export class UsernamePasswordInput {
    @Field()
    email: string;
    @Field()
    username: string;
    @Field()
    password: string;
}
