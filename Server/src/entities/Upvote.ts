import { ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

// m to n relationship
// many to many
// user <-> posts
// user -> join table <- posts
// user -> upvote <- posts

// can stack decorators!
// convert class to graphql type by using @ObjectType decorator
@ObjectType()
@Entity()
export class Upvote extends BaseEntity {
    @Column({ type: "int" })
    value: number;

    @PrimaryColumn()
    userId: number;

    @ManyToOne(() => User, (user) => user.upvotes)
    user: User;

    //we will store foreign key in this creatorId column
    @PrimaryColumn()
    postId: number;

    //will setup foreign key to the post's table
    @ManyToOne(() => Post, (post) => post.upvotes, {
        // when a post is deleted, it will also delete the upvote if connected
        onDelete: "CASCADE",
    })
    post: Post;
}
