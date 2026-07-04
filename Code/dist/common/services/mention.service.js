"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mentionService = exports.MentionService = void 0;
const repository_1 = require("../../DB/repository");
const exceptions_1 = require("../exceptions");
const objectId_1 = require("../utils/objectId");
const notification_service_1 = require("./notification.service");
const redis_service_1 = require("./redis.service");
class MentionService {
    userRepository;
    redis;
    notificationService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = redis_service_1.redisService;
        this.notificationService = notification_service_1.notificationService;
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
        const tagObjectIds = ids.map((id) => (0, objectId_1.toObjectId)(id));
        const isFriendAndExist = await this.userRepository.countDocuments({
            _id: userId,
            friends: { $all: tagObjectIds },
        });
        if (isFriendAndExist === 0) {
            throw new exceptions_1.BadRequestException("One or more tagged users are not in your friends list");
        }
    }
    async sendMentionNotifications({ user, tags, entityId, message, }) {
        if (!tags?.length)
            return;
        const fcmResults = await Promise.all(tags.map((tag) => this.redis.getFCMs(tag)));
        const fcmTokens = new Set(fcmResults.filter(Boolean).flat());
        if (!fcmTokens.size)
            return;
        this.notificationService
            .sendNotifications({
            tokens: [...fcmTokens],
            title: `${user.username} mentioned you`,
            body: JSON.stringify({ message, entityId }),
        })
            .catch((err) => console.error("Failed to send mention notifications", err));
    }
}
exports.MentionService = MentionService;
exports.mentionService = new MentionService();
