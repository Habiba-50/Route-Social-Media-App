"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationValidationSchema = exports.generalValidationFields = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.generalValidationFields = {
    email: zod_1.z.email(),
    password: zod_1.z
        .string()
        .regex(/^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W)[\w\W\d].{8,25}$/, {
        error: "Password must be 8-25 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
    username: zod_1.z
        .string({ error: "Username is mandatory" })
        .min(2, { error: "min is 2 characters" })
        .max(25, { error: "max is 25 characters" }),
    confirmPassword: zod_1.z.string(),
    phone: zod_1.z
        .string({ error: "phone is required" })
        .regex(/^(02|2|\+2)?01[0-25]\d{8}$/),
    otp: zod_1.z
        .string({ error: "OTP is required" })
        .regex(/^\d{6}$/, { error: "OTP must be 6 digits" }),
    id: zod_1.z.string().refine((id) => mongoose_1.Types.ObjectId.isValid(id), { error: "Invalid ID" }),
    content: zod_1.z.string().min(2, { error: "Content is too short" }).max(1000, { error: "Content is too long" }).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    availability: zod_1.z.coerce.number().default(enums_1.AvailabilityEnum.PUBLIC),
    file: function (mimetype = ['any']) {
        return zod_1.z.strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            size: zod_1.z.number()
        }).superRefine((args, ctx) => {
            if (!args.path && !args.buffer) {
                ctx.addIssue({
                    code: "custom",
                    message: "buffer is required",
                    path: ['buffer']
                });
            }
        });
    }
};
exports.paginationValidationSchema = {
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().optional(),
        size: zod_1.z.coerce.number().optional(),
        search: zod_1.z.string().optional(),
    })
};
