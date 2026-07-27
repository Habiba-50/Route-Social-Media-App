"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModel = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const messageSschema = new mongoose_1.Schema({
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function () {
            return this.files?.length ? false : true;
        }
    },
    files: { type: [String] },
    likes: [{ userId: { type: mongoose_1.Types.ObjectId, ref: "User" }, react: { type: Number } }],
    tags: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date },
    restoredAt: { type: Date }
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
});
const chatSchema = new mongoose_1.Schema({
    participants: [{ type: mongoose_1.Types.ObjectId, ref: "User", required: true }],
    createdBy: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: enums_1.ChatEnum, default: enums_1.ChatEnum.OVO },
    groupName: { type: String, required: function () {
            return this.type === enums_1.ChatEnum.OVM;
        } },
    roomId: { type: String, required: function () {
            return this.type === enums_1.ChatEnum.OVM;
        }
    },
    groupIcon: { type: String },
    groupDescription: { type: String },
    messages: { type: [messageSschema], required: true },
    deletedAt: { type: Date },
    restoredAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_CHATS'
});
chatSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    const { force, ...restQuery } = query;
    if (force === true) {
        this.setQuery(restQuery);
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...restQuery });
    }
});
exports.ChatModel = mongoose_1.models.Chat || (0, mongoose_1.model)('Chat', chatSchema);
