"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const index_1 = require("../model/index");
const base_repository_1 = require("./base.repository");
class PostRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(index_1.PostModel);
    }
}
exports.PostRepository = PostRepository;
