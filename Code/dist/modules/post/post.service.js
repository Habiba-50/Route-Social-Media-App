"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const repository_1 = require("../../DB/repository");
class PostService {
    postRepository;
    constructor() {
        this.postRepository = new repository_1.PostRepository();
    }
    async createPost(post, user) {
        const createdPost = await this.postRepository.create({ data: { ...post, createdBy: user._id } });
        return createdPost;
    }
    async updatePost(id, post, user) {
        const updatedPost = await this.postRepository.updateOne({
            filter: {
                _id: id,
                createdBy: user._id
            }, update: {
                $set: {
                    ...post,
                    updatedBy: user._id
                }
            }
        });
        if (updatedPost.modifiedCount === 0) {
            throw new Error("Post not found");
        }
        return updatedPost;
    }
    async deletePost(id) {
        const result = await this.postRepository.deleteOne({ filter: { _id: id } });
        if (result.deletedCount === 0) {
            throw new Error("Post not found");
        }
        return result;
    }
    async getPost(id) {
        const post = await this.postRepository.findOne({ filter: { _id: id } });
        if (!post) {
            throw new Error("Post not found");
        }
        return post;
    }
}
exports.PostService = PostService;
exports.default = new PostService();
