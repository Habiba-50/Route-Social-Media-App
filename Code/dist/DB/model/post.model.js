"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = void 0;
const mongoose_1 = require("mongoose");
const postSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function () {
            return this.attachments?.length ? false : true;
        }
    },
    attachments: {
        type: [{ secure_url: String, public_id: String }],
        default: []
    },
    likes: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
    tags: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_POSTS'
});
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)('Post', postSchema);
