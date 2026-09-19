"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationValidation = exports.getRepostsOfPostValidation = exports.undoRepostValidation = exports.repostValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_1 = require("../../common/validation");
exports.repostValidation = {
    params: zod_1.default.strictObject({
        postId: validation_1.generalValidationFields.id
    }),
    body: zod_1.default.strictObject({
        content: zod_1.default.string().max(200, "Content must be at most 200 characters long").optional()
    })
};
exports.undoRepostValidation = {
    params: zod_1.default.strictObject({
        repostId: validation_1.generalValidationFields.id
    })
};
exports.getRepostsOfPostValidation = {
    params: zod_1.default.strictObject({
        postId: validation_1.generalValidationFields.id
    }),
    query: zod_1.default.strictObject({
        page: zod_1.default.string().optional().default("1"),
        size: zod_1.default.string().optional().default("10")
    })
};
exports.paginationValidation = {
    query: zod_1.default.strictObject({
        page: zod_1.default.string().optional().default("1"),
        size: zod_1.default.string().optional().default("10")
    })
};
