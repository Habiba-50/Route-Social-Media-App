"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mySavedPostsValidation = exports.savePostValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_1 = require("../../common/validation");
exports.savePostValidation = {
    params: zod_1.default.object({
        postId: validation_1.generalValidationFields.id
    })
};
exports.mySavedPostsValidation = {
    query: validation_1.paginationValidationSchema.query,
};
