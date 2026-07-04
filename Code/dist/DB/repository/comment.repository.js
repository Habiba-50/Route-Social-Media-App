"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentRepository = void 0;
const index_1 = require("../model/index");
const base_repository_1 = require("./base.repository");
class CommentRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(index_1.CommentModel);
    }
}
exports.CommentRepository = CommentRepository;
