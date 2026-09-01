"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mentionService = exports.MentionService = void 0;
const repository_1 = require("../../DB/repository");
const exceptions_1 = require("../exceptions");
const objectId_1 = require("../utils/objectId");
const notification_service_1 = require("./notification.service");
const redis_service_1 = require("./redis.service");
const enums_1 = require("../enums");
class MentionService {
    userRepository;
    friendRequestRepository;
    redis;
    notificationService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = redis_service_1.redisService;
        this.notificationService = notification_service_1.notificationService;
        this.friendRequestRepository = new repository_1.FriendRequestRepository();
    }
    async validateUserIds(ids, fieldName = "tags") {
        if (!ids.length)
            return;
        const normalizedIds = [
            ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
        ];
        if (!normalizedIds.length)
            return;
        const users = await this.userRepository.findAll({
            filter: {
                _id: {
                    $in: normalizedIds.map((id) => (0, objectId_1.toObjectId)(id)),
                },
            },
        });
        if (!users || users.length !== normalizedIds.length) {
            throw new exceptions_1.NotFoundException(`Some or all ${fieldName} IDs not found in the system.`);
        }
    }
    async validateMentionedUsers(userId, ids) {
        if (!ids.length)
            return;
        const tagObjectIds = [...new Set(ids)].map((id) => (0, objectId_1.toObjectId)(id));
        if (!tagObjectIds.length)
            return;
        const friendRequests = await this.friendRequestRepository.findAll({
            filter: {
                status: enums_1.FriendRequestStatusEnum.ACCEPTED,
                deletedAt: { $exists: false },
                $or: [
                    {
                        senderId: userId,
                        receiverId: { $in: tagObjectIds },
                    },
                    {
                        receiverId: userId,
                        senderId: { $in: tagObjectIds },
                    },
                ],
            },
        });
        const friendIds = friendRequests?.map((friend) => friend.senderId.toString() === userId.toString()
            ? friend.receiverId.toString()
            : friend.senderId.toString());
        if (friendIds?.length !== tagObjectIds.length) {
            throw new exceptions_1.BadRequestException("One or more tagged users are not in your friends list");
        }
    }
    async sendMentionNotifications({ user, tags, entityId, message, }) {
        if (!tags?.length)
            return;
        Promise.allSettled(tags.map(async (tagUserId) => {
            const tokens = await this.redis.getFCMs(tagUserId);
            if (tokens?.length) {
                await this.notificationService.sendNotifications({
                    userId: tagUserId,
                    tokens,
                    title: `${user.username} mentioned you in a comment`,
                    body: message,
                    entityId,
                    entityType: "post",
                    senderId: user._id.toString(),
                    type: enums_1.NotificationType.MENTION,
                });
            }
        })).catch((err) => console.error("Failed to send mention notifications", err));
    }
}
exports.MentionService = MentionService;
exports.mentionService = new MentionService();
