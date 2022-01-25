import argon2 from "argon2";
import { MyContext } from "src/types";
import {
    Arg,
    Ctx,
    Field,
    FieldResolver,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    Root,
} from "type-graphql";
import { getConnection } from "typeorm";
import { v4 } from "uuid";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/User";
import { sendEmail } from "../utils/sendEmail";
import { validateRegister } from "../utils/validateRegister";
// import { sendEmail } from "src/utils/sendEmail";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

@ObjectType()
class FieldError {
    @Field()
    field: string;

    @Field()
    message: string;
}

//akin to creating an exception class, to be returned by login
@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[]; //? because we want the class to return undefined by default

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver(User)
export class UserResolver {
    @FieldResolver(() => String)
    email(@Root() user: User, @Ctx() { req }: MyContext) {
        // this is the current user and its okay to show them their own email
        if (req.session.userId === user.id) {
            return user.email;
        }

        // current user wants to see someone elses email, which we don't want them to be able to (design choice)
        return "";
    }

    //We are going to return a user after they change their password and log them in right away
    @Mutation(() => UserResponse)
    async changePassword(
        @Arg("token") token: string,
        @Arg("newPassword") newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        // in a real application, you might want to abstract this validation logic out, because its a copy
        // paste from validateRegister util
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "length must be greater than 2",
                    },
                ],
            };
        }

        const key = FORGET_PASSWORD_PREFIX + token;
        // after we check if the password is good,
        // check if token is good by looking it up on redis
        const userId = await redis.get(key);
        if (!userId) {
            //token is not in redis -> no associated user
            return {
                errors: [
                    {
                        field: "token",
                        message: "token expired",
                        // another possibility could be the token was 'tampered' with, but sending
                        // a bad error message isn't that big of a deal here.
                    },
                ],
            };
        }

        const userIdNum = parseInt(userId);
        const user = await User.findOne(userIdNum);

        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "user no longer exists",
                    },
                ],
            };
        }

        // updatedAt field will automatically be updated
        User.update(
            { id: userIdNum },
            { password: await argon2.hash(newPassword) }
        );

        // delete token so user can't user same token to update password again (design choice)
        await redis.del(key);

        // login user after changed password by setting session (optional)
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() { redis }: MyContext
    ) {
        const user = await User.findOne({ where: email }); //if you want to search by a column thats not the primary key, use {where: }
        if (!user) {
            // the email is not in the database
            return true;
        }

        // will create a unique token
        const token = v4();

        // its a good idea to put a prefix in front of keys so you can seperate them and look them up if needed
        // storing key in redis
        await redis.set(
            FORGET_PASSWORD_PREFIX + token,
            user.id,
            "ex",
            1000 * 60 * 60 * 72
        ); //token will be good for 3 days

        await sendEmail(
            // change http://localhost:3000 to url if I wanted to set up an actual email provider to send emails
            email,
            `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
        );
        return true;
    }

    //This query returns the user if there are logged in
    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        //if the are not logged in, return null
        if (!req.session.userId) {
            return null;
        }

        return User.findOne(req.session.userId);
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("options") options: UsernamePasswordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors) {
            return { errors };
        }
        //hashing password before sending it to database (using argon2 instead of BCrypt)
        const hashedPassword = await argon2.hash(options.password);
        let user;
        try {
            // User.create({...}).save() is the same as the querybuilder below
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: options.username,
                    password: hashedPassword,
                    email: options.email,
                })
                .returning("*")
                .execute();
            user = result.raw[0];
            // await em.persistAndFlush(user);
        } catch (err) {
            // duplicate username error
            if (err.code === "23505" || err.detail.includes("already exists")) {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username already taken",
                        },
                    ],
                };
            }
        }

        //you can store information about the user that never changes here...

        // store user id session
        // this will set a cookie on the user
        // keep them logged in
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        //hashing password before sending it to database (using argon2 instead of BCrypt)
        const user = await User.findOne(
            usernameOrEmail.includes("@")
                ? { where: { email: usernameOrEmail } }
                : { where: { username: usernameOrEmail } }
        );
        if (!user) {
            return {
                errors: [
                    {
                        field: "usernameOrEmail",
                        message: "that username doesn't exist",
                    },
                ],
            };
        }
        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "incorrect password",
                    },
                ],
            };
        }

        //think of this as an object that we store anything inside of
        req.session!.userId = user.id;

        return {
            user,
        };
    }

    //steps for succesfully logging out
    //1. Destroy redis session
    //2. Clear cookie
    //3. Update Cache
    //4. Redirect?
    @Mutation(() => Boolean) //we dont really need any information when a user logs out other than if it was succesfull
    logout(@Ctx() { req, res }: MyContext) {
        //destroy() will remove session from redis
        return new Promise((resolve) =>
            req.session.destroy((err) => {
                // this will clear the cookie regardless if the session was destroyed succesfully or not
                // can also move this after the if statement
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }

                resolve(true);
            })
        );
    }
}
