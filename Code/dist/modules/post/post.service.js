"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const repository_1 = require("../../DB/repository");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const node_crypto_1 = require("node:crypto");
const enums_1 = require("../../common/enums");
const post_1 = require("../../common/utils/post");
const objectId_1 = require("../../common/utils/objectId");
class PostService {
    postRepository;
    userRepository;
    redis;
    notificationService;
    s3;
    constructor() {
        this.postRepository = new repository_1.PostRepository();
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.notificationService = services_1.notificationService;
        this.s3 = services_1.s3Service;
    }
    normalizePostResponse(post) {
        const data = post?.toJSON?.() ?? post;
        const { attachments, ...restData } = data || {};
        return {
            ...restData,
            files: Array.isArray(restData?.files) ? restData.files : [],
        };
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
            throw new exceptions_1.BadRequestException("You can only tag users who are in your friends list");
        }
    }
    async sendMentionNotifications({ user, tags, postId, message, }) {
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
            body: JSON.stringify({
                message,
                postId,
            }),
        })
            .catch((err) => console.error("Failed to send mention notifications", err));
    }
    async createPost({ availability, tags, content, files }, user) {
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.validateUserIds(normalizedTags, "tags");
        await this.validateMentionedUsers(user._id, normalizedTags);
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
        await this.sendMentionNotifications({
            user,
            tags: normalizedTags,
            postId: createdPost._id.toString(),
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
        let uploadedFiles = [];
        const currentFiles = post.files || [];
        const filesToDelete = currentFiles.filter((file) => removeFiles.includes(file));
        if (filesToDelete.length) {
            await this.s3.deleteAssets({
                Keys: filesToDelete.map((file) => ({ Key: file })),
            });
        }
        if (files.length) {
            uploadedFiles = await this.s3.uploadAssets({
                files: files,
                path: `post/${post.folderId}`,
            });
        }
        const normalizedTags = [
            ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        const normalizedRemoveTags = [
            ...new Set((removeTags || []).map((tag) => tag.trim()).filter(Boolean)),
        ];
        await this.validateUserIds(normalizedTags, "tags");
        await this.validateMentionedUsers(user._id, normalizedTags);
        await this.validateUserIds(normalizedRemoveTags, "removeTags");
        const tagsToAdd = normalizedTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        const tagsToRemove = normalizedRemoveTags.map((tag) => (0, objectId_1.toObjectId)(tag));
        const expectedfilesCount = currentFiles.length - filesToDelete.length + uploadedFiles.length;
        if (!content && !post.content && expectedfilesCount === 0) {
            throw new exceptions_1.conflictException("Post must contain content or attachments");
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
                                { $setDifference: ["$files", removeFiles] },
                                uploadedFiles,
                            ],
                        },
                        tags: {
                            $setUnion: [
                                { $setDifference: ["$tags", tagsToRemove] },
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
        const notifyTaggedUsers = normalizedTags.filter((tag) => !post.tags?.some((existingTag) => existingTag.toString() === tag));
        if (updatedPost) {
            await this.sendMentionNotifications({
                user,
                tags: notifyTaggedUsers,
                postId: updatedPost._id.toString(),
                message: `${user.username} mentioned you in a post update`,
            });
        }
        return this.normalizePostResponse(updatedPost);
    }
    async reactPost({ postId }, { react }, user) {
        const post = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user),
            },
            update: {
                ...(Number(react) > 0
                    ? { $addToSet: { likes: { react: Number(react), userId: user._id } } }
                    : { $pull: { likes: user._id } }),
            },
            options: { new: true },
        });
        console.log(post?.likes);
        if (!post) {
            throw new exceptions_1.NotFoundException("Post not found");
        }
        return post.toJSON();
    }
    async getPost(id, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: id,
                createdBy: user._id,
            },
        });
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
}
exports.PostService = PostService;
exports.default = new PostService();
