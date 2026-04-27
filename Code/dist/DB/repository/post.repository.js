"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const post_model_1 = require("../model/post.model");
const base_repository_1 = require("./base.repository");
class PostRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(post_model_1.PostModel);
    }
}
exports.PostRepository = PostRepository;
