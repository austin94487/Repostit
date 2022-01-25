import { Field, Int, ObjectType } from "type-graphql";
import {
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Column,
    BaseEntity,
    OneToMany,
} from "typeorm";
import { Post } from "./Post";
import { Upvote } from "./Upvote";
// can stack decorators!
// convert class to graphql type by using @ObjectType decorator
@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field(() => Int) //@Field decotor exposes attribute to graphql schema
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column({ unique: true })
    username!: string;

    @Field()
    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @OneToMany(() => Post, (post) => post.creator)
    posts: Post[];

    @OneToMany(() => Upvote, (upvote) => upvote.userId)
    upvotes: Upvote[];

    @Field(() => String) // you have to explicity set type
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}
