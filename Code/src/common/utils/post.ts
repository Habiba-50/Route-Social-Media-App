import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { AvailabilityEnum } from "../enums";
import { friendRequestService } from "../../modules/friendRequest";

export const getAvailability = async (
    user: HydratedDocument<IUser>
) => {
    const friendIds = await friendRequestService.getAcceptedFriendIds(user._id);

    return [
        { availability: AvailabilityEnum.PUBLIC },

        {
            availability: AvailabilityEnum.FRIENDS,
            $or: [
                { createdBy: user._id },
                { createdBy: { $in: friendIds } }
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