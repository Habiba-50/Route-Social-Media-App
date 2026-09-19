"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkRepository = void 0;
const base_repository_1 = require("./base.repository");
const model_1 = require("../model");
class BookmarkRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(model_1.BookmarkModel);
    }
}
exports.BookmarkRepository = BookmarkRepository;
