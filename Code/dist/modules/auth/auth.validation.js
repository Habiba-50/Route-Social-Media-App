"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.email = exports.confirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const enums_1 = require("../../common/enums");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
        password: validation_1.generalValidationFields.password,
    }).catchall(zod_1.z.string())
};
exports.signup = {
    body: exports.login.body.safeExtend({
        username: validation_1.generalValidationFields.username,
        phone: validation_1.generalValidationFields.phone,
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
        gender: zod_1.z.enum(enums_1.GenderEnum, { error: "Invalid gender" }),
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, {
        error: "Passwords don't match",
    }),
    query: zod_1.z.strictObject({
        flag: zod_1.z.coerce.boolean()
    })
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
        otp: validation_1.generalValidationFields.otp,
    }).catchall(zod_1.z.string())
};
exports.email = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
    }).catchall(zod_1.z.string())
};
exports.resetPassword = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
        password: validation_1.generalValidationFields.password,
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
    }).catchall(zod_1.z.string()).refine((data) => {
        return data.password === data.confirmPassword;
    }, {
        error: "Passwords don't match",
    })
};
