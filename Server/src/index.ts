// To setup:
// Start Postgres server
// Open MacOS terminal and enter: brew services start redis
// Open VSCode Terminal 1 and enter: yarn watch
// Open VSCode Terminal 2 and enter: yarn dev
// Open VSCode Terminal 3
// When finished:
// Stop Postgres server
// Stop Redis server by entering into MacOS Terminal: brew services stop redis
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
//cors middleware package from express to set cors globally
import cors from "cors";
import express from "express";
import "reflect-metadata"; // typegraphql and typeorm both require this
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { HelloResolver } from "./resolvers/hello";
import PostResolver from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
const Redis = require("ioredis");
const session = require("express-session");
import path from "path";
import { Upvote } from "./entities/Upvote";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpvoteLoader } from "./utils/createUpvoteLoader";

//rerun
const main = async () => {
    // create database connection
    const conn = await createConnection({
        type: "postgres",
        database: "repostit",
        username: "postgres",
        password: "postgres",
        // url: process.env.DATABASE_URL,
        logging: true,
        // synchronize: true,
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [Post, User, Upvote],
    });
    await conn.runMigrations();
    // await Upvote.delete({});
    // await Post.delete({});

    // create instance of express
    const app = express();

    // Redis is an in-memory database. We're gonna use it to store session data instead of PostgreSQL
    //because Redis is just faster
    // Redis is able to get sessions and the data for it very quickly.
    // On every request, we're going to need to check if the user is logged in.
    // To do that we're going to query the session for the user which means we need to hit Redis and
    //Redis is very fast.
    const RedisStore = connectRedis(session);
    //we won't use the redis client anywhere else, but if we did we could put in a different file and
    //import it into the files we needed it in
    const redis = new Redis();
    // tell express that we have a proxy sitting in front of our API so that cookies and sessions work
    // app.set("proxy", 1);

    app.use(
        // '/', // you can declare the route you want middleware to run on
        cors({
            origin: "http://localhost:3000",
            credentials: true,
        })
    );

    // order here matters
    // The order we add express middleware is the order they will run
    // So session middleware will run before apollo middleware
    // Which is important because we will be using session middleware inside apollo
    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //setting max age for session to 10 years
                httpOnly: true, //can't access cookie in front-end JS code
                sameSite: "lax", // csrf protection
                secure: __prod__, // cookie only works in https (set to true to only work in prod)
            },
            saveUninitialized: false,
            secret: "qwiudfbi2qioobweufoqij3hrbeiuk",
            resave: false,
        })
    );
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),
        // context is a special object that is accessible by all resolvers
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: createUserLoader(), // baches and caches users in a single sql request (very good!)
            upvoteLoader: createUpvoteLoader(),
        }),
    });
    // example get request endpoint
    // usually (req, res) but since we are ignoring the request, we can replace it with an underscore
    // app.get('/', (_, res) => {
    //     res.send("hello");
    // });

    //this will create a graphql endpoint on express server
    //this will successfully setup a GraphQL server using TypeGraphQL being the graphQL schema
    apolloServer.applyMiddleware({
        app,
        cors: false,
        // cors: { origin: "http://localhost:3000"}, // defaults to wildcard '*' which will cause CORS error
    });

    app.listen(4000, () => {
        console.log("server started on localhost:4000");
    });
};

main().catch((err) => {
    console.error(err);
});
