"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactPost = exports.getPost = exports.deletePost = exports.updatePost = exports.createPost = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const mongoose_1 = require("mongoose");
const multer_1 = require("../../common/utils/multer");
exports.createPost = {
    body: zod_1.z.strictObject({
        content: validation_1.generalValidationFields.content,
        tags: validation_1.generalValidationFields.tags,
        availability: validation_1.generalValidationFields.availability,
        files: zod_1.z.array(validation_1.generalValidationFields.file(multer_1.fileFieldValidation.image)).optional()
    }).superRefine((args, ctx) => {
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ['tags'],
                    message: "Duplicated tags are not allowed"
                });
            }
            for (const tag of args.tags) {
                if (!mongoose_1.Types.ObjectId.isValid(tag)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ['tags'],
                        message: `Invalid tagged objectId: ${tag}`
                    });
                }
            }
        }
    }),
};
exports.updatePost = {
    body: zod_1.z.strictObject({
        content: validation_1.generalValidationFields.content.optional(),
        availability: validation_1.generalValidationFields.availability.optional(),
        removeFiles: zod_1.z.array(zod_1.z.string()).optional(),
        files: zod_1.z.array(validation_1.generalValidationFields.file(multer_1.fileFieldValidation.image)).optional(),
        tags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
        removeTags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
    }).superRefine((args, ctx) => {
        if (!Object.keys(args).length) {
            ctx.addIssue({
                code: "custom",
                message: "Insert data to update",
            });
        }
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ['tags'],
                    message: "Duplicated tags are not allowed"
                });
            }
            for (const tag of args.tags) {
                if (!mongoose_1.Types.ObjectId.isValid(tag)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ['tags'],
                        message: `Invalid tagged objectId: ${tag}`
                    });
                }
            }
        }
    }),
    files: zod_1.z
        .array(validation_1.generalValidationFields.file(multer_1.fileFieldValidation.image))
        .optional(),
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id
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
exports.reactPost = {
    query: zod_1.z.strictObject({
        react: zod_1.z.coerce.number()
    }),
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
    })
};
