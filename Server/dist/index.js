"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const connect_redis_1 = __importDefault(require("connect-redis"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
require("reflect-metadata");
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const constants_1 = require("./constants");
const Post_1 = require("./entities/Post");
const User_1 = require("./entities/User");
const hello_1 = require("./resolvers/hello");
const post_1 = __importDefault(require("./resolvers/post"));
const user_1 = require("./resolvers/user");
const Redis = require("ioredis");
const session = require("express-session");
const path_1 = __importDefault(require("path"));
const Upvote_1 = require("./entities/Upvote");
const createUserLoader_1 = require("./utils/createUserLoader");
const createUpvoteLoader_1 = require("./utils/createUpvoteLoader");
const main = async () => {
    const conn = await (0, typeorm_1.createConnection)({
        type: "postgres",
        database: "repostit",
        username: "postgres",
        password: "postgres",
        logging: true,
        migrations: [path_1.default.join(__dirname, "./migrations/*")],
        entities: [Post_1.Post, User_1.User, Upvote_1.Upvote],
    });
    await conn.runMigrations();
    const app = (0, express_1.default)();
    const RedisStore = (0, connect_redis_1.default)(session);
    const redis = new Redis();
    app.use((0, cors_1.default)({
        origin: "http://localhost:3000",
        credentials: true,
    }));
    app.use(session({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax",
            secure: constants_1.__prod__,
        },
        saveUninitialized: false,
        secret: "qwiudfbi2qioobweufoqij3hrbeiuk",
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, post_1.default, user_1.UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: (0, createUserLoader_1.createUserLoader)(),
            upvoteLoader: (0, createUpvoteLoader_1.createUpvoteLoader)(),
        }),
    });
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });
    app.listen(4000, () => {
        console.log("server started on localhost:4000");
    });
};
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map