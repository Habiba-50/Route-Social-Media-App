"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = exports.CommentService = void 0;
const repository_1 = require("../../DB/repository");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const post_1 = require("../../common/utils/post");
const objectId_1 = require("../../common/utils/objectId");
const enums_1 = require("../../common/enums");
const notification_1 = require("../notification");
class CommentService {
    postRepository;
    commentRepository;
    mentionService;
    s3;
    notificationService;
    redisService;
    notificationModuleService;
    constructor() {
        this.postRepository = new repository_1.PostRepository();
        this.commentRepository = new repository_1.CommentRepository();
        this.mentionService = services_1.mentionService;
        this.s3 = services_1.s3Service;
        this.notificationService = services_1.notificationService;
        this.redisService = services_1.redisService;
        this.notificationModuleService = new notification_1.NotificationModuleService();
    }
    async createComment({ postId }, { tags, content, files }, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: await (0, post_1.getAvailability)(user),
            },
        });
        if (!post)
            throw new exceptions_1.NotFoundException("Post not found or not accessible");
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.mentionService.validateUserIds(normalizedTags, "tags");
        const tagObjectIds = normalizedTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadAssets({
                files: files,
                path: `post/${post.folderId}/comments`,
            });
        }
        const createdComment = await this.commentRepository.create({
            data: {
                content,
                createdBy: user._id,
                files: attachments,
                postId,
                tags: tagObjectIds,
            },
        });
        if (!createdComment && attachments.length) {
            await this.s3.deleteAssets({ Keys: attachments.map((key) => ({ Key: key })) })
                .catch((err) => console.error("S3 rollback failed:", err));
            throw new exceptions_1.BadRequestException("Failed to create comment");
        }
        this.mentionService
            .sendMentionNotifications({
            user,
            tags: normalizedTags,
            entityId: createdComment._id.toString(),
            message: `${user.username} mentioned you in a comment`,
        })
            .catch((err) => console.error("Mention notification failed:", err));
        if (user._id.toString() !== post.createdBy.toString()) {
            const userTokens = await this.redisService.getFCMs(post.createdBy.toString());
            this.notificationService.sendNotifications({
                userId: post.createdBy.toString(),
                tokens: userTokens,
                title: `${user.username} commented on your post`,
                body: content,
                entityId: createdComment._id.toString(),
                entityType: "post",
                senderId: user._id.toString(),
                type: enums_1.NotificationType.COMMENT,
            })
                .catch((err) => console.error("Comment notification failed:", err));
        }
        await this.notificationModuleService.createNotification({
            title: `${user.username} commented on your post`,
            body: content,
            senderId: (0, objectId_1.toObjectId)(user._id.toString()),
            receiverId: (0, objectId_1.toObjectId)(post.createdBy.toString()),
            type: enums_1.NotificationType.COMMENT,
            referenceId: (0, objectId_1.toObjectId)(createdComment._id.toString()),
            onModel: "post",
        })
            .catch((err) => console.error("Comment notification failed:", err));
        return createdComment;
    }
    async updateComment({ postId, commentId }, { content, files = [], tags = [], removeTags = [], removeFiles = [] }, user) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                createdBy: user._id,
                deletedAt: { $exists: false },
            },
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            $or: await (0, post_1.getAvailability)(user),
                        }
                    }
                ]
            }
        });
        if (!comment) {
            throw new exceptions_1.NotFoundException("Comment not found or not accessible");
        }
        if (!comment.postId) {
            throw new exceptions_1.NotFoundException("Post not found or not accessible");
        }
        const currentFiles = comment.files || [];
        const filesToDelete = currentFiles.filter((file) => removeFiles.includes(file));
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        const normalizedRemoveTags = [
            ...new Set((removeTags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.mentionService.validateUserIds(normalizedTags, "tags");
        await this.mentionService.validateMentionedUsers(user._id, normalizedTags);
        await this.mentionService.validateUserIds(normalizedRemoveTags, "removeTags");
        const tagsToAdd = normalizedTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        const tagsToRemove = normalizedRemoveTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        const expectedFilesCount = currentFiles.length -
            filesToDelete.length +
            files.length;
        if (!content && !comment.content && expectedFilesCount === 0) {
            throw new exceptions_1.conflictException("Comment must contain content or attachments");
        }
        let uploadedFiles = [];
        try {
            if (files.length) {
                uploadedFiles = await this.s3.uploadAssets({
                    files: files,
                    path: `post/${postId}/comments/${commentId}`,
                });
            }
            console.log(`path: post/${postId}/comments/${commentId}`);
            const updatedComment = await this.commentRepository.findOneAndUpdate({
                filter: {
                    _id: commentId,
                    createdBy: user._id,
                    deletedAt: { $exists: false },
                },
                update: [
                    {
                        $set: {
                            content: content !== undefined ? content : "$content",
                            updatedBy: user._id,
                            files: {
                                $setUnion: [
                                    {
                                        $setDifference: ["$files", removeFiles],
                                    },
                                    uploadedFiles,
                                ],
                            },
                            tags: {
                                $setUnion: [
                                    {
                                        $setDifference: ["$tags", tagsToRemove],
                                    },
                                    tagsToAdd,
                                ],
                            },
                        },
                    },
                ],
                options: {
                    new: true,
                },
            });
            if (!updatedComment) {
                throw new exceptions_1.BadRequestException("Comment wasn't updated successfully");
            }
            if (filesToDelete.length) {
                await this.s3.deleteAssets({
                    Keys: filesToDelete.map((file) => ({
                        Key: file,
                    })),
                });
            }
            const notifyTaggedUsers = normalizedTags.filter((tag) => !comment.tags?.some((existingTag) => existingTag.toString() === tag));
            this.mentionService.sendMentionNotifications({
                user,
                tags: notifyTaggedUsers,
                entityId: updatedComment._id.toString(),
                message: `${user.username} mentioned you in a comment update`,
            });
            return updatedComment;
        }
        catch (error) {
            if (uploadedFiles.length) {
                try {
                    await this.s3.deleteAssets({
                        Keys: uploadedFiles.map((file) => ({
                            Key: file,
                        })),
                    });
                }
                catch (rollbackError) {
                    console.error("Failed to rollback uploaded files", rollbackError);
                }
            }
            throw error;
        }
    }
    async replyOnComment({ postId, commentId }, { tags, content, files }, user) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                postId: (0, objectId_1.toObjectId)(postId),
            },
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            $or: await (0, post_1.getAvailability)(user),
                        }
                    }
                ],
            }
        });
        if (!comment)
            throw new exceptions_1.NotFoundException("Comment not found or not accessible");
        if (!comment.postId)
            throw new exceptions_1.BadRequestException("Post not found or not accessible");
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.mentionService.validateUserIds(normalizedTags, "tags");
        const tagObjectIds = normalizedTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadAssets({
                files: files,
                path: `post/${comment.postId}/comments/${comment._id}/replies`,
            });
        }
        const reply = await this.commentRepository.create({
            data: {
                content,
                createdBy: user._id,
                files: attachments,
                postId,
                commentId: (0, objectId_1.toObjectId)(commentId),
                tags: tagObjectIds,
            },
        });
        if (!reply && attachments.length) {
            await this.s3.deleteAssets({ Keys: attachments.map((key) => ({ Key: key })) })
                .catch((err) => console.error("S3 rollback failed:", err));
            throw new exceptions_1.BadRequestException("Failed to create comment");
        }
        this.mentionService
            .sendMentionNotifications({
            user,
            tags: normalizedTags,
            entityId: reply._id.toString(),
            message: `${user.username} mentioned you in a comment`,
        })
            .catch((err) => console.error("Mention notification failed:", err));
        const userTokens = await this.redisService.getFCMs(comment.createdBy.toString());
        if (userTokens?.length) {
            this.notificationService.sendNotifications({
                userId: comment.createdBy.toString(),
                tokens: userTokens,
                title: "New reply on your comment",
                body: `${user.username} replied to your comment`,
                entityId: comment._id.toString(),
                entityType: "Comment",
                senderId: user._id.toString(),
                type: String(enums_1.NotificationType.COMMENT),
            });
        }
        await this.notificationModuleService.createNotification({
            title: "New reply on your comment",
            body: `${user.username} replied to your comment`,
            senderId: (0, objectId_1.toObjectId)(user._id.toString()),
            receiverId: (0, objectId_1.toObjectId)(comment.createdBy.toString()),
            type: enums_1.NotificationType.COMMENT,
            referenceId: reply._id,
            onModel: "comment",
        })
            .catch((err) => console.error("Comment notification failed:", err));
        return reply;
    }
    async deleteComment({ postId, commentId }, user) {
        const comment = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                createdBy: user._id,
                deletedAt: { $exists: false },
            },
            update: [
                {
                    $set: {
                        deletedAt: new Date(),
                        updatedBy: user._id,
                    },
                },
            ],
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            $or: await (0, post_1.getAvailability)(user),
                        }
                    }
                ]
            }
        });
        if (!comment) {
            throw new exceptions_1.conflictException("Comment not found or not accessible");
        }
    }
    async restoreComment({ postId, commentId }, user) {
        const comment = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                createdBy: user._id,
                deletedAt: { $exists: true },
            },
            update: [
                {
                    $unset: "deletedAt",
                },
            ],
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            $or: await (0, post_1.getAvailability)(user),
                        }
                    }
                ]
            }
        });
        if (!comment) {
            throw new exceptions_1.conflictException("Comment not found or not accessible");
        }
    }
    async reactComment({ postId, commentId }, { react }, user) {
        const comment = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                postId: (0, objectId_1.toObjectId)(postId),
                $or: await (0, post_1.getAvailability)(user),
            },
            update: {
                ...(Number(react) > 0
                    ? { $addToSet: { likes: { react: enums_1.ReactEnum[react], userId: user._id } } }
                    : { $pull: { likes: { userId: user._id } } }),
            },
            options: { new: true },
        });
        if (!comment) {
            throw new exceptions_1.NotFoundException("Comment not found");
        }
        if (comment.createdBy.toString() !== user._id.toString()) {
            const tokens = await this.redisService.getFCMs(comment.createdBy.toString());
            console.log("tokens", tokens);
            if (tokens?.length) {
                await this.notificationService.sendNotifications({
                    userId: comment.createdBy.toString(),
                    tokens,
                    title: "New Reaction on your comment",
                    body: `${user.username} reacted to your comment`,
                    entityId: comment._id.toString(),
                    entityType: "comment",
                    senderId: user._id.toString(),
                    type: enums_1.NotificationType.LIKE,
                });
            }
            await this.notificationModuleService.createNotification({
                title: "New Reaction on your comment",
                body: `${user.username} reacted to your comment`,
                senderId: user._id,
                receiverId: (0, objectId_1.toObjectId)(comment.createdBy.toString()),
                type: enums_1.NotificationType.LIKE,
                onModel: "Comment",
                referenceId: comment._id,
            });
        }
        return comment.toJSON();
    }
    async reactReply({ postId, commentId, replyId }, { react }, user) {
        const reply = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(replyId),
                postId: (0, objectId_1.toObjectId)(postId),
                commentId: (0, objectId_1.toObjectId)(commentId),
                $or: await (0, post_1.getAvailability)(user),
            },
            update: {
                ...(Number(react) > 0
                    ? { $addToSet: { likes: { react: enums_1.ReactEnum[react], userId: user._id } } }
                    : { $pull: { likes: { userId: user._id } } }),
            },
            options: { new: true },
        });
        if (!reply) {
            throw new exceptions_1.NotFoundException("Reply not found");
        }
        if (reply.createdBy.toString() !== user._id.toString()) {
            const tokens = await this.redisService.getFCMs(reply.createdBy.toString());
            console.log("tokens", tokens);
            if (tokens?.length) {
                await this.notificationService.sendNotifications({
                    userId: reply.createdBy.toString(),
                    tokens,
                    title: "New Reaction on your reply",
                    body: `${user.username} reacted to your reply`,
                    entityId: reply._id.toString(),
                    entityType: "reply",
                    senderId: user._id.toString(),
                    type: enums_1.NotificationType.LIKE,
                });
            }
            await this.notificationModuleService.createNotification({
                title: "New Reaction on your reply",
                body: `${user.username} reacted to your reply`,
                senderId: user._id,
                receiverId: (0, objectId_1.toObjectId)(reply.createdBy.toString()),
                type: enums_1.NotificationType.LIKE,
                onModel: "Comment",
                referenceId: reply._id,
            });
        }
        return reply.toJSON();
    }
    async getComments({ commentId }) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                deletedAt: null
            },
            options: {
                populate: [
                    {
                        path: "replies"
                    }
                ]
            }
        });
        if (!comment) {
            throw new Error("Post not found");
        }
        return comment;
    }
    async destroyComment({ postId, commentId }, user) {
        const comment = await this.commentRepository.findOneAndDelete({
            filter: {
                _id: (0, objectId_1.toObjectId)(commentId),
                createdBy: user._id,
                deletedAt: { $exists: true },
            },
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            $or: await (0, post_1.getAvailability)(user),
                        }
                    }
                ]
            }
        });
        if (!comment) {
            throw new exceptions_1.conflictException("Comment not found or not accessible");
        }
        if (comment.files?.length) {
            await this.s3.deleteAssets({
                Keys: comment.files.map((key) => ({ Key: key })),
            });
        }
        return { message: "Comment deleted successfully" };
    }
    async deleteCommentsByPostId({ postId }, user, session) {
        await this.commentRepository.deleteMany({
            filter: {
                postId: (0, objectId_1.toObjectId)(postId),
                createdBy: user._id,
                $or: await (0, post_1.getAvailability)(user),
            },
        });
        return { message: "Comments deleted successfully" };
    }
}
exports.CommentService = CommentService;
exports.commentService = new CommentService();
