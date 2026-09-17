"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repostService = exports.RepostService = void 0;
const repository_1 = require("../../DB/repository");
const objectId_1 = require("../../common/utils/objectId");
const enums_1 = require("../../common/enums");
const exceptions_1 = require("../../common/exceptions");
const notification_1 = require("../notification");
const services_1 = require("../../common/services");
class RepostService {
    repostRepository;
    postRepository;
    blockRepository;
    notificationModuleService;
    redisService;
    notificationService;
    constructor() {
        this.repostRepository = new repository_1.RepostRepository();
        this.postRepository = new repository_1.PostRepository();
        this.blockRepository = new repository_1.BlockRepository();
        this.notificationModuleService = new notification_1.NotificationModuleService();
        this.redisService = services_1.redisService;
        this.notificationService = new services_1.NotificationService();
    }
    async sendRepostNotification(repost, post, user) {
        try {
            await this.notificationModuleService.createNotification({
                title: "Repost",
                body: `${user.firstName} ${user.lastName} shared your post`,
                senderId: user._id,
                receiverId: post.createdBy,
                type: enums_1.NotificationType.REPOST,
                onModel: "Repost",
                referenceId: repost._id,
            });
        }
        catch (error) {
            console.log("Failed to create notification:", error);
        }
        const receiverUserTokens = await this.redisService.getFCMs(post.createdBy);
        if (receiverUserTokens?.length) {
            try {
                await this.notificationService.sendNotifications({
                    userId: post.createdBy?.toString(),
                    tokens: receiverUserTokens,
                    title: "Repost",
                    body: `${user.firstName} ${user.lastName} shared your post`,
                    entityId: repost._id.toString(),
                    entityType: "repost",
                    senderId: user._id.toString(),
                    type: enums_1.NotificationType.REPOST,
                });
            }
            catch (error) {
                console.log("Failed to send notification:", error);
            }
        }
    }
    async createRepost(postId, body, user) {
        const { content } = body || {};
        const post = await this.postRepository.findOne({
            filter: { _id: (0, objectId_1.toObjectId)(postId), deletedAt: { $exists: false } }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Post not found");
        }
        if (post?.createdBy.toString() === user._id.toString()) {
            throw new exceptions_1.BadRequestException("You can not share your own post");
        }
        if (post.availability !== enums_1.AvailabilityEnum.PUBLIC) {
            throw new exceptions_1.BadRequestException("Only public posts can be shared");
        }
        const authorId = post.createdBy;
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                $or: [
                    { blockerId: user._id, blockedId: authorId },
                    { blockerId: authorId, blockedId: user._id }
                ],
                deletedAt: { $exists: false },
            }
        });
        if (isBlocked) {
            throw new exceptions_1.BadRequestException("You can not share this post");
        }
        const checkRepost = await this.repostRepository.findOne({
            filter: { originalPostId: (0, objectId_1.toObjectId)(postId), repostedBy: user._id }
        });
        if (checkRepost?.deletedAt) {
            const restoredRepost = await this.repostRepository.findOneAndUpdate({
                filter: { _id: checkRepost._id },
                update: { $set: { restoredAt: new Date() }, $unset: { deletedAt: "" } },
                options: { new: true }
            });
            if (!restoredRepost) {
                throw new exceptions_1.BadRequestException("Failed to restore repost");
            }
            await this.sendRepostNotification(restoredRepost, post, user);
            return restoredRepost;
        }
        if (checkRepost) {
            throw new exceptions_1.BadRequestException("You have already shared this post");
        }
        const repost = await this.repostRepository.create({
            data: {
                originalPostId: (0, objectId_1.toObjectId)(postId),
                repostedBy: user._id,
                content: content ?? undefined
            }
        });
        await this.sendRepostNotification(repost, post, user);
        return repost;
    }
    async deleteRepost(repostId, user) {
        const repost = await this.repostRepository.findOneAndUpdate({
            filter: { _id: (0, objectId_1.toObjectId)(repostId), repostedBy: user._id },
            update: { $set: { deletedAt: new Date() }, $unset: { restoredAt: "" } },
            options: { new: true }
        });
        if (!repost) {
            throw new exceptions_1.NotFoundException("Repost not found");
        }
        return true;
    }
    async getRepostsOfPost(postId, { page, size }) {
        const reposts = await this.repostRepository.paginate({
            filter: { originalPostId: (0, objectId_1.toObjectId)(postId), deletedAt: { $exists: false } },
            page, size,
            options: {
                sort: { createdAt: -1 },
                populate: [{ path: "repostedBy", select: "firstName lastName profileImageUrl" }]
            }
        });
        return reposts;
    }
    async getUserReposts(user, { page, size }) {
        const data = await this.repostRepository.paginate({
            filter: { repostedBy: user._id, deletedAt: { $exists: false } },
            page, size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    {
                        path: "originalPostId",
                        select: "_id content files createdBy",
                        populate: { path: "createdBy", select: "firstName lastName profileImageUrl" }
                    }
                ]
            }
        });
        return data;
    }
}
exports.RepostService = RepostService;
exports.repostService = new RepostService();
