"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const postSchema = new mongoose_1.Schema({
    folderId: {
        type: String
    },
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
    availability: {
        type: Number,
        enum: enums_1.AvailabilityEnum,
        default: enums_1.AvailabilityEnum.PUBLIC
    },
    likes: [{ userId: { type: mongoose_1.Types.ObjectId, ref: "User" }, react: { type: Number } }],
    tags: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
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
    collection: 'SOCIAL_MEDIA_APP_POSTS'
});
postSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    const { force, ...restQuery } = query;
    if (force === true) {
        this.setQuery(restQuery);
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...restQuery });
    }
});
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)('Post', postSchema);
