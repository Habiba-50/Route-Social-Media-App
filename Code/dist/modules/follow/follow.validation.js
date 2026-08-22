"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowingUsers = exports.getFollowersUsers = exports.unfollow = exports.follow = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
exports.follow = {
    params: zod_1.z.strictObject({
        followingId: validation_1.generalValidationFields.id
    }),
};
exports.unfollow = exports.follow;
exports.getFollowersUsers = {
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default("1"),
        size: zod_1.z.string().optional().default("10"),
    })
};
exports.getFollowingUsers = exports.getFollowersUsers;
