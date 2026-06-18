import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { AvailabilityEnum } from "../enums";

// export const getAvailability = (user:HydratedDocument<IUser>) => {
//     return  [
//             { availability: AvailabilityEnum.PUBLIC },
//             { availability: AvailabilityEnum.FRIENDS, createdBy: { $in: [...user.friends || [] , user._id] } },
//             { availability: AvailabilityEnum.ONLY_ME, createdBy: user._id },
//             { tags: { $in: [user._id] } }
//         ]

// }

export const getAvailability = (
    user: HydratedDocument<IUser>
) => {
    return [
        { availability: AvailabilityEnum.PUBLIC },

        {
            availability: AvailabilityEnum.FRIENDS,
            $or: [
                { createdBy: user._id },
                { createdBy: { $in: user.friends || [] } }
            ]
        },

        {
            availability: AvailabilityEnum.ONLY_ME,
            createdBy: user._id
        },

        {
            tags: { $in: [user._id] }
        }
    ];
};
    