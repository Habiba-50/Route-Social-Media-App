"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
const mongoose_1 = require("mongoose");
const commentSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function () {
            return this.files?.length ? false : true;
        }
    },
    files: {
        type: [String]
    },
    likes: [{ userId: { type: mongoose_1.Types.ObjectId, ref: "User" }, react: { type: String } }],
    tags: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
    postId: { type: mongoose_1.Types.ObjectId, ref: "Post" },
    commentId: { type: mongoose_1.Types.ObjectId, ref: "Comment" },
    createdBy: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    deletedAt: {
        type: Date
    },
    restoredAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_COMMENTS'
});
commentSchema.virtual("replies", {
    ref: "Comment",
    localField: "_id",
    foreignField: "commentId",
});
commentSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    const { force, ...restQuery } = query;
    if (force === true) {
        this.setQuery(restQuery);
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...restQuery });
    }
});
exports.CommentModel = mongoose_1.models.Comment || (0, mongoose_1.model)('Comment', commentSchema);
