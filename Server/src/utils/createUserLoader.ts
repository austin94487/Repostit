import DataLoader from "dataloader";
import { User } from "../entities/User";

// keys will be an array of user ids : [1,75, 23 ,43]
// returns user for each index in array : [{id: 1, username: 'tim'}, {id:75, username: 'joe'},...]
export const createUserLoader = () =>
    new DataLoader<number, User>(async (userIds) => {
        // get all users in 1 sql query
        const users = await User.findByIds(userIds as number[]);

        const userIdtoUser: Record<number, User> = {};
        users.forEach((u) => {
            userIdtoUser[u.id] = u;
        });

        //returns array of users in desired shape
        return userIds.map((userId) => userIdtoUser[userId]);
    });
