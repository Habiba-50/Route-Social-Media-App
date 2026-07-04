"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComment = exports.reactComment = exports.deleteComment = exports.replyOnComment = exports.createComment = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const multer_1 = require("../../common/utils/multer");
exports.createComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
    }),
    body: zod_1.z
        .strictObject({
        content: validation_1.generalValidationFields.content,
        tags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
        files: zod_1.z
            .array(validation_1.generalValidationFields.file(multer_1.fileFieldValidation.image))
            .optional(),
        removeTags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
        removeFiles: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .superRefine((args, ctx) => {
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated tags are not allowed",
                });
            }
        }
    }),
};
exports.replyOnComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
        commentId: validation_1.generalValidationFields.id,
    }),
    body: exports.createComment.body
};
exports.deleteComment = {
    params: exports.replyOnComment.params
};
exports.reactComment = {
    query: zod_1.z.strictObject({
        react: zod_1.z.coerce.number()
    }),
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
        commentId: validation_1.generalValidationFields.id,
    })
};
exports.getComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
        commentId: validation_1.generalValidationFields.id,
    })
};
