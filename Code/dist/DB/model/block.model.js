"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockModel = void 0;
const mongoose_1 = require("mongoose");
const blockSchema = new mongoose_1.Schema({
    blockerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    blockedId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date },
    restoredAt: { type: Date }
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_BLOCKS'
});
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
exports.BlockModel = mongoose_1.models.Block || (0, mongoose_1.model)('Block', blockSchema);
