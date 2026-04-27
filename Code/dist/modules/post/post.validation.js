"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPost = exports.deletePost = exports.updatePost = exports.createPost = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const mongoose_1 = require("mongoose");
exports.createPost = {
    body: zod_1.z.strictObject({
        content: validation_1.generalValidationFields.content,
    }).catchall(zod_1.z.string())
};
exports.updatePost = {
    body: zod_1.z.strictObject({
        content: validation_1.generalValidationFields.content,
    }).catchall(zod_1.z.string()),
    params: zod_1.z.strictObject({
        id: zod_1.z.string().refine((id) => mongoose_1.Types.ObjectId.isValid(id), { error: "Invalid post ID" }),
    })
};
exports.deletePost = {
    params: zod_1.z.strictObject({
        id: zod_1.z.string().refine((id) => mongoose_1.Types.ObjectId.isValid(id), { error: "Invalid post ID" }),
    })
};
exports.getPost = {
    params: zod_1.z.strictObject({
        id: validation_1.generalValidationFields.id,
    })
};
