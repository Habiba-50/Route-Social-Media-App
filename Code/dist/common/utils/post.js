"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailability = void 0;
const enums_1 = require("../enums");
const friendRequest_1 = require("../../modules/friendRequest");
const repository_1 = require("../../DB/repository");
const exceptions_1 = require("../exceptions");
const getAvailability = async (user) => {
    const blockRepository = new repository_1.BlockRepository();
    const isBlocked = await blockRepository.findOne({
        filter: {
            $or: [
                { blockerId: user._id },
                { blockedId: user._id }
            ],
            deletedAt: { $exists: false },
        }
    });
    if (isBlocked) {
        throw new exceptions_1.BadRequestException("This post is not available");
    }
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
