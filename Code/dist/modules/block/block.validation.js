"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlockedValidation = exports.myBlockedUsersValidation = exports.unblockValidation = exports.blockValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_1 = require("../../common/validation");
exports.blockValidation = {
    params: zod_1.default.strictObject({
        blockedId: validation_1.generalValidationFields.id
    })
};
exports.unblockValidation = exports.blockValidation;
exports.myBlockedUsersValidation = {
    query: zod_1.default.strictObject({
        page: zod_1.default.string().optional().default("1").transform((val) => Number(val)),
        size: zod_1.default.string().optional().default("10").transform((val) => Number(val)),
        search: zod_1.default.string().optional()
    })
};
exports.isBlockedValidation = exports.blockValidation;
