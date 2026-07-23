"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileGQL = void 0;
const zod_1 = __importDefault(require("zod"));
exports.profileGQL = zod_1.default.strictObject({
    search: zod_1.default.string().min(2, "Search query must be at least 2 character long").optional(),
});
