"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = exports.CommentService = void 0;
const repository_1 = require("../../DB/repository");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const post_1 = require("../../common/utils/post");
const objectId_1 = require("../../common/utils/objectId");
const enums_1 = require("../../common/enums");
class CommentService {
    postRepository;
    commentRepository;
    mentionService;
    s3;
    constructor() {
        this.postRepository = new repository_1.PostRepository();
        this.commentRepository = new repository_1.CommentRepository();
        this.mentionService = services_1.mentionService;
        this.s3 = services_1.s3Service;
    }
    async createComment({ postId }, { tags, content, files }, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user),
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
                            $or: (0, post_1.getAvailability)(user),
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
                            $or: (0, post_1.getAvailability)(user),
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
                            $or: (0, post_1.getAvailability)(user),
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
                            $or: (0, post_1.getAvailability)(user),
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
                $or: (0, post_1.getAvailability)(user),
            },
            update: {
                ...(Number(react) > 0
                    ? { $addToSet: { likes: { react: enums_1.ReactEnum[react], userId: user._id } } }
                    : { $pull: { likes: user._id } }),
            },
            options: { new: true },
        });
        if (!comment) {
            throw new exceptions_1.NotFoundException("Comment not found");
        }
        return comment.toJSON();
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
                            $or: (0, post_1.getAvailability)(user),
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
                $or: (0, post_1.getAvailability)(user),
            },
        });
        return { message: "Comments deleted successfully" };
    }
}
exports.CommentService = CommentService;
exports.commentService = new CommentService();
