"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequest = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const friendRequestSchema = new mongoose_1.Schema({
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: enums_1.FriendRequestStatusEnum,
    },
    deletedAt: {
        type: Date,
    }
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_FRIEND_REQUESTS',
    strict: true,
    strictQuery: true
});
friendRequestSchema.index({ recieverId: 1, status: 1 });
friendRequestSchema.index({ senderId: 1, status: 1 });
exports.FriendRequest = mongoose_1.models.FriendRequest || (0, mongoose_1.model)("FriendRequest", friendRequestSchema);
