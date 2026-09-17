"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepostModel = void 0;
const mongoose_1 = require("mongoose");
const repostSchema = new mongoose_1.Schema({
    originalPostId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Post" },
    repostedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, default: "" },
    deletedAt: { type: Date },
    restoredAt: { type: Date }
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_REPOSTS'
});
repostSchema.index({ originalPostId: 1, repostedBy: 1 }, {
    unique: true,
    partialFilterExpression: {
        deletedAt: { $exists: false }
    }
});
exports.RepostModel = mongoose_1.models.Repost || (0, mongoose_1.model)('Repost', repostSchema);
