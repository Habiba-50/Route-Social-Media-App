import { model, models, Schema, Types } from "mongoose"
import { IPost } from "../../common/interfaces"


const postSchema = new Schema<IPost>({
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function () {
            return this.attachments?.length ? false : true
        }
    },
    attachments: {
        type: [{ secure_url: String, public_id: String }],
        default: []
    },
    likes: [{ type: Types.ObjectId, ref: "User" }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_POSTS'
})

export const PostModel = models.Post || model<IPost>('Post', postSchema)