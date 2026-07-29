"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repository_1 = require("../../DB/repository");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const node_crypto_1 = require("node:crypto");
const enums_1 = require("../../common/enums");
const post_1 = require("../../common/utils/post");
const objectId_1 = require("../../common/utils/objectId");
const comment_service_1 = require("../comment/comment.service");
const realtime_1 = require("../realtime");
class PostService {
    postRepository;
    mentionService;
    commentService;
    s3;
    redisService;
    realtimeGateway;
    constructor() {
        this.postRepository = new repository_1.PostRepository();
        this.mentionService = services_1.mentionService;
        this.commentService = new comment_service_1.CommentService();
        this.s3 = services_1.s3Service;
        this.redisService = services_1.redisService;
        this.realtimeGateway = realtime_1.realtimeGateway;
    }
    normalizePostResponse(post) {
        const data = post?.toJSON?.() ?? post;
        const { attachments, ...restData } = data || {};
        return {
            ...restData,
            files: Array.isArray(restData?.files) ? restData.files : [],
        };
    }
    async createPost({ availability, tags, content, files }, user) {
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.mentionService.validateUserIds(normalizedTags, "tags");
        await this.mentionService.validateMentionedUsers(user._id, normalizedTags);
        const tagObjectIds = normalizedTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        const folderId = (0, node_crypto_1.randomUUID)();
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadAssets({
                files: files,
                path: `post/${folderId}`,
            });
        }
        const createdPost = await this.postRepository.create({
            data: {
                content,
                createdBy: user._id,
                files: attachments,
                folderId,
                availability,
                tags: tagObjectIds,
            },
        });
        if (!createdPost) {
            if (attachments?.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map((ele) => ({
                        Key: ele,
                    })),
                });
            }
            throw new exceptions_1.BadRequestException("Failed to create post");
        }
        await this.mentionService.sendMentionNotifications({
            user,
            tags: normalizedTags,
            entityId: createdPost._id.toString(),
            message: `${user.username} mentioned you in a post`,
        });
        return this.normalizePostResponse(createdPost);
    }
    async updatePost({ postId }, { content, availability, removeFiles = [], files = [], tags = [], removeTags = [], }, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                createdBy: user._id,
                deletedAt: { $exists: false },
            },
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Post not found");
        }
        const currentFiles = post.files || [];
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
        if (!content && !post.content && expectedFilesCount === 0) {
            throw new exceptions_1.conflictException("Post must contain content or attachments");
        }
        let uploadedFiles = [];
        try {
            if (files.length) {
                uploadedFiles = await this.s3.uploadAssets({
                    files: files,
                    path: `post/${post.folderId}`,
                });
            }
            const updatedPost = await this.postRepository.findOneAndUpdate({
                filter: {
                    _id: postId,
                    createdBy: user._id,
                    deletedAt: { $exists: false },
                },
                update: [
                    {
                        $set: {
                            content: content !== undefined ? content : "$content",
                            availability: availability !== undefined
                                ? Number(availability)
                                : "$availability",
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
            if (!updatedPost) {
                throw new exceptions_1.BadRequestException("Post wasn't updated successfully");
            }
            if (filesToDelete.length) {
                await this.s3.deleteAssets({
                    Keys: filesToDelete.map((file) => ({
                        Key: file,
                    })),
                });
            }
            const notifyTaggedUsers = normalizedTags.filter((tag) => !post.tags?.some((existingTag) => existingTag.toString() === tag));
            this.mentionService.sendMentionNotifications({
                user,
                tags: notifyTaggedUsers,
                entityId: updatedPost._id.toString(),
                message: `${user.username} mentioned you in a post update`,
            });
            return this.normalizePostResponse(updatedPost);
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
    async reactPost({ postId }, { react }, user) {
        const post = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(postId),
                $or: (0, post_1.getAvailability)(user),
            },
            update: {
                ...(Number(react) > 0
                    ? { $addToSet: { likes: { react: Number(react), userId: user._id } } }
                    : { $pull: { likes: { userId: user._id } } }),
            },
            options: {
                new: true,
                populate: [
                    { path: "createdBy" },
                    { path: "likes.userId" }
                ]
            }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Post not found");
        }
        const owner = post.createdBy;
        const socketIds = await this.redisService.getSockets(owner._id);
        console.log("Socket Id's:", socketIds);
        if (socketIds.length && Number(react) > 0) {
            this.realtimeGateway.getIo().to(socketIds).emit("react_post", {
                postId: post._id,
                react: Number(react),
                userId: user._id
            });
        }
        return post;
    }
    async getPost(id, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: id,
                createdBy: user._id,
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        select: "content",
                    },
                    { path: "likes", select: "react userId" }
                ],
            },
        });
        console.log(post);
        if (!post || post.deletedAt) {
            throw new Error("Post not found");
        }
        return this.normalizePostResponse(post);
    }
    async getPostList({ page, size, search, }, user) {
        const posts = await this.postRepository.paginate({
            filter: {
                $or: (0, post_1.getAvailability)(user),
                ...(search ? { content: { $regex: search, $options: "i" } } : {}),
            },
            page,
            size,
            options: {
                populate: [
                    { path: "likes.userId" },
                    { path: "createdBy" },
                    { path: "tags" },
                    { path: "updatedBy" },
                    {
                        path: "comments",
                        populate: [
                            {
                                path: "replies",
                                populate: [
                                    {
                                        path: "replies",
                                    },
                                ],
                            },
                        ],
                    },
                ]
            }
        });
        return {
            ...posts,
            docs: (posts.docs || []).map((post) => this.normalizePostResponse(post)),
        };
    }
    async deletePost(id, user) {
        const result = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: id,
                createdBy: user._id,
                deletedAt: { $exists: false },
            },
            update: {
                deletedAt: new Date(),
                updatedBy: user._id,
            },
            options: { new: true },
        });
        if (!result) {
            throw new Error("Post not found");
        }
        return result;
    }
    async restorePost(id, user) {
        const result = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: id,
                $or: [{ createdBy: user._id }, { role: enums_1.RoleEnum.ADMIN }],
                deletedAt: { $exists: true },
            },
            update: {
                $unset: {
                    deletedAt: 1,
                },
                updatedBy: user._id,
            },
            options: { new: true },
        });
        if (!result) {
            throw new Error("Post not found");
        }
        return result;
    }
    async destroyPost(id, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: id,
                $or: [{ createdBy: user._id }, { role: enums_1.RoleEnum.ADMIN }],
            },
        });
        if (!post) {
            throw new Error("Post not found");
        }
        const assetKeys = post.files?.map((file) => ({
            Key: file,
        }));
        const session = await mongoose_1.default.startSession();
        try {
            session.startTransaction();
            await this.postRepository.deleteOne({
                filter: { _id: id },
                options: { session },
            });
            await this.commentService.deleteCommentsByPostId({ postId: id }, user, session);
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        try {
            if (assetKeys?.length) {
                await this.s3.deleteAssets({
                    Keys: assetKeys,
                });
            }
        }
        catch (error) {
            console.error(error);
        }
        return post;
    }
}
exports.PostService = PostService;
exports.default = new PostService();
