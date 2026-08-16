"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Follow = void 0;
const mongoose_1 = require("mongoose");
const followSchema = new mongoose_1.Schema({
    followingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    followerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isDeleted: {
        type: Boolean,
    }
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_FOLLOWS'
});
followSchema.index({
    followerId: 1,
    followingId: 1,
}, {
    unique: true,
});
exports.Follow = mongoose_1.models.Follow || (0, mongoose_1.model)("Follow", followSchema);
