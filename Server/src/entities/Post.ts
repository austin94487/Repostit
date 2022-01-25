import { Field, Int, ObjectType } from "type-graphql";
import {
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Column,
    BaseEntity,
    ManyToOne,
    OneToMany,
} from "typeorm";
import { Upvote } from "./Upvote";
import { User } from "./User";

// can stack decorators!
// convert class to graphql type by using @ObjectType decorator
@ObjectType()
@Entity()
export class Post extends BaseEntity {
    @Field() //@Field decotor exposes attribute to graphql schema
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    title!: string;

    @Field()
    @Column()
    text!: string;

    @Field()
    @Column({ type: "int", default: 0 })
    points!: number; //upvotes and downvotes

    // will keep track of whether a user has voted on a post
    @Field(() => Int, { nullable: true })
    voteStatus: number | null; // 1 or -1 or null

    //we will store foreign key in this creatorId column
    @Field()
    @Column()
    creatorId: number;

    //will setup foreign key to the user's table
    //typeorm will automatically fetch the user for us
    @Field()
    @ManyToOne(() => User, (user) => user.posts)
    creator: User;

    @OneToMany(() => Upvote, (upvote) => upvote.post)
    upvotes: Upvote[];

    @Field(() => String) // you have to explicity set type
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}
