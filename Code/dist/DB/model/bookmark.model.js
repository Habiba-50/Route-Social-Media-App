"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkModel = void 0;
const mongoose_1 = require("mongoose");
const bookmarkSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: 'User'
    },
    postId: {
        type: mongoose_1.Types.ObjectId,
        ref: 'Post'
    },
    deletedAt: {
        type: Date
    },
    restoredAt: {
        type: Date
    }
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_BOOKMARKS',
    strict: true,
    strictQuery: true,
});
bookmarkSchema.index({ userId: 1, postId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: { $exists: false } }
});
exports.BookmarkModel = mongoose_1.models.Bookmark || (0, mongoose_1.model)('Bookmark', bookmarkSchema);
