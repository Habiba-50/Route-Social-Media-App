"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postResolver = exports.PostResolver = void 0;
const post_service_1 = require("./../post.service");
const validation_1 = require("../../../common/validation");
const middleware_1 = require("../../../middleware");
const post_validation_1 = require("../post.validation");
class PostResolver {
    postService;
    constructor() {
        this.postService = new post_service_1.PostService();
    }
    postList = async (parent, args, { user }, info) => {
        await (0, middleware_1.GQLValidation)(validation_1.paginationValidationSchema.query, args);
        const postList = await this.postService.getPostList(args, user);
        return { data: postList };
    };
    reactOnPost = async (parent, args, { user }, info) => {
        await (0, middleware_1.GQLValidation)(post_validation_1.reactOnPostGQL, args);
        const { postId, react } = args;
        const result = await this.postService.reactPost({ postId }, { react }, user);
        console.log(result);
        return { message: "Reacted on post", data: result };
    };
}
exports.PostResolver = PostResolver;
exports.postResolver = new PostResolver();
