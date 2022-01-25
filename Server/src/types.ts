import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUpvoteLoader } from "./utils/createUpvoteLoader";
import { createUserLoader } from "./utils/createUserLoader";

export type MyContext = {
    req: Request & { session: Express.Session }; //removing possibility for undefined to be returned
    redis: Redis;
    res: Response;
    userLoader: ReturnType<typeof createUserLoader>; // ReturnType <> will give return type of a given function
    upvoteLoader: ReturnType<typeof createUpvoteLoader>; // same as above
};
