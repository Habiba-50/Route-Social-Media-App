"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repository_1 = require("../../DB/repository");
const follow_repository_1 = require("../../DB/repository/follow.repository");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const services_2 = require("../../common/services");
const enums_1 = require("../../common/enums");
const notification_1 = require("../notification");
const objectId_1 = require("../../common/utils/objectId");
class FollowService {
    userRepository;
    followRepository;
    notificationService;
    redisService;
    notificationModuleService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.followRepository = new follow_repository_1.FollowRepository();
        this.notificationService = services_1.notificationService;
        this.redisService = services_2.redisService;
        this.notificationModuleService = new notification_1.NotificationModuleService();
    }
    async follow(user, followingId) {
        if (user._id.toString() === followingId) {
            throw new exceptions_1.BadRequestException("You cannot follow yourself");
        }
        const followingUser = await this.userRepository.findOne({
            filter: { _id: followingId },
        });
        if (!followingUser) {
            throw new exceptions_1.NotFoundException("User not found");
        }
        const session = await mongoose_1.default.startSession();
        try {
            session.startTransaction();
            const follow = await this.followRepository.create({
                data: {
                    followerId: user._id.toString(),
                    followingId,
                },
                options: { session },
            });
            if (!follow || Array.isArray(follow)) {
                throw new exceptions_1.BadRequestException("Failed to create follow record");
            }
            await this.userRepository.findOneAndUpdate({
                filter: { _id: user._id.toString() },
                update: { $inc: { followingCount: 1 } },
                options: { session },
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: followingId },
                update: { $inc: { followersCount: 1 } },
                options: { session },
            });
            await session.commitTransaction();
            await this.notificationModuleService.createNotification({
                title: "New Follower",
                body: `${user.firstName} ${user.lastName} started following you`,
                senderId: user._id,
                receiverId: (0, objectId_1.toObjectId)(followingId),
                type: enums_1.NotificationType.FOLLOW,
                onModel: "User",
                referenceId: user._id,
            });
            const followingUserTokens = await this.redisService.getFCMs(followingId);
            if (followingUserTokens?.length) {
                await this.notificationService.sendNotifications({
                    userId: followingId,
                    tokens: followingUserTokens,
                    title: "New Follower",
                    body: `${user.firstName} ${user.lastName} started following you`,
                    entityId: follow._id.toString(),
                    entityType: "follow",
                    senderId: user._id.toString(),
                    type: enums_1.NotificationType.FOLLOW,
                });
            }
            return follow;
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async unFollow(followerId, followingId) {
        const session = await mongoose_1.default.startSession();
        try {
            session.startTransaction();
            const unFollowed = await this.followRepository.findOneAndDelete({
                filter: {
                    followerId,
                    followingId,
                },
                options: { session, new: true },
            });
            if (!unFollowed || Array.isArray(unFollowed)) {
                throw new exceptions_1.BadRequestException("You already unfollowed this user");
            }
            await this.userRepository.findOneAndUpdate({
                filter: { _id: followerId },
                update: { $inc: { followingCount: -1 } },
                options: { session },
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: followingId },
                update: { $inc: { followersCount: -1 } },
                options: { session },
            });
            await session.commitTransaction();
            return unFollowed;
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async getFollowingUsers(followerId) {
        const followingUsers = await this.followRepository.findAll({
            filter: {
                followerId,
            },
            options: {
                populate: {
                    path: "followingId",
                    select: "firstName lastName",
                },
            }
        });
        return followingUsers;
    }
    async getFollowersUsers(followingId) {
        const followersUsers = await this.followRepository.findAll({
            filter: {
                followingId,
            },
            options: {
                populate: {
                    path: "followerId",
                    select: "firstName lastName",
                },
            }
        });
        return followersUsers;
    }
}
exports.FollowService = FollowService;
exports.default = new FollowService();
