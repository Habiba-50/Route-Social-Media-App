"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.confirmEmail = exports.signup = exports.login = exports.email = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const enums_1 = require("../../common/enums");
exports.email = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
    })
};
exports.login = {
    body: exports.email.body.safeExtend({
        password: validation_1.generalValidationFields.password,
        fcm: zod_1.z.string().optional(),
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
    body: exports.email.body.safeExtend({
        otp: validation_1.generalValidationFields.otp,
    })
};
exports.resetPassword = {
    body: exports.email.body.safeExtend({
        password: validation_1.generalValidationFields.password,
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, {
        error: "Passwords don't match",
    })
};
