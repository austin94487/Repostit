import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

//one way to make sure a user that isn't logged in can't make a post is to use an if-statement
//middleware will run before resolver
export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
    if (!context.req.session.userId) {
        throw new Error("not authenticated");
    }

    return next();
};
