"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookmarkService = exports.BookmarkService = void 0;
const exceptions_1 = require("../../common/exceptions");
const objectId_1 = require("../../common/utils/objectId");
const repository_1 = require("../../DB/repository");
const post_1 = require("../../common/utils/post");
class BookmarkService {
    bookmarkRepository;
    postRepository;
    constructor() {
        this.bookmarkRepository = new repository_1.BookmarkRepository();
        this.postRepository = new repository_1.PostRepository();
    }
    async checkPostExistence(postId, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(postId),
                deletedAt: { $exists: false },
                $or: await (0, post_1.getAvailability)(user)
            }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Post not found");
        }
    }
    async savePost(user, postId) {
        await this.checkPostExistence(postId, user);
        const checkBookmark = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: (0, objectId_1.toObjectId)(postId)
            }
        });
        if (checkBookmark && !checkBookmark?.deletedAt) {
            throw new exceptions_1.BadRequestException("You have already saved this post");
        }
        if (checkBookmark && checkBookmark?.deletedAt) {
            const updateBookmark = await this.bookmarkRepository.findOneAndUpdate({
                filter: {
                    _id: checkBookmark._id
                },
                update: {
                    $unset: { deletedAt: "" },
                    restoredAt: new Date()
                },
                options: {
                    new: true
                }
            });
            return updateBookmark;
        }
        const bookmark = await this.bookmarkRepository.create({
            data: {
                userId: user._id,
                postId: (0, objectId_1.toObjectId)(postId)
            }
        });
        return bookmark;
    }
    async unsavePost(user, postId) {
        const checkBookmark = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: (0, objectId_1.toObjectId)(postId)
            }
        });
        if (!checkBookmark || checkBookmark?.deletedAt) {
            throw new exceptions_1.BadRequestException("You have not saved this post");
        }
        const updateBookmark = await this.bookmarkRepository.findOneAndUpdate({
            filter: {
                _id: checkBookmark._id
            },
            update: {
                $set: { deletedAt: new Date() },
                $unset: { restoredAt: "" }
            },
            options: {
                new: true
            }
        });
        return updateBookmark;
    }
    async mySavedPosts(user, { page, size }) {
        const savedPosts = await this.bookmarkRepository.paginate({
            filter: {
                userId: user._id,
                deletedAt: { $exists: false }
            },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    {
                        path: "postId",
                        select: "content files createdAt",
                        populate: [
                            {
                                path: "createdBy",
                                select: "_id firstName lastName profileImage "
                            }
                        ]
                    }
                ]
            }
        });
        return savedPosts;
    }
    async isSavedPost(user, postId) {
        await this.checkPostExistence(postId, user);
        const bookmark = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: (0, objectId_1.toObjectId)(postId),
                deletedAt: { $exists: false }
            }
        });
        return !!bookmark;
    }
}
exports.BookmarkService = BookmarkService;
exports.bookmarkService = new BookmarkService();
