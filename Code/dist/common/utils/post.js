"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailability = void 0;
const enums_1 = require("../enums");
const friendRequest_1 = require("../../modules/friendRequest");
const getAvailability = async (user) => {
    const friendIds = await friendRequest_1.friendRequestService.getAcceptedFriendIds(user._id);
    return [
        { availability: enums_1.AvailabilityEnum.PUBLIC },
        {
            availability: enums_1.AvailabilityEnum.FRIENDS,
            $or: [
                { createdBy: user._id },
                { createdBy: { $in: friendIds } }
            ]
        },
        {
            availability: enums_1.AvailabilityEnum.ONLY_ME,
            createdBy: user._id
        },
        {
            tags: { $in: [user._id] }
        }
    ];
};
exports.getAvailability = getAvailability;
