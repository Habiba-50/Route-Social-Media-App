import { model, models, Schema, Types } from "mongoose";
import { INotification } from "../../common/interfaces";
import { NotificationType } from "../../common/enums/index";


const notificationSchema = new Schema<INotification>(
    {
        title : {
            type: String,
            required: true
        },
        body : {
            type: String,
            required: true
        },
        senderId : {
            type: Types.ObjectId,
            required: true,
            ref: "User",
        },
        receiverId : {
            type: Types.ObjectId,
            required: true
        },
        isRead : {
            type: Boolean,
            default: false,
        },
        type : {
            type: String,
            enum: NotificationType,
            required: true,
        },

        referenceId : {
            type: Types.ObjectId,
            required: true,
            refPath: "onModel"
        },
        onModel : {
            type: String,
            required: true,
            enum: ["Post", "Comment", "Like", "Reply"],
        }
        
    },
    {
        timestamps: true,
        collection: 'SOCIAL_MEDIA_APP_NOTIFICATIONS',
        strict: true,
        strictQuery: true,
    }
)

export const NotificationModel = models.Notification || model<INotification>('Notification', notificationSchema)