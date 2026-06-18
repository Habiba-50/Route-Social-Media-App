import { Types } from "mongoose";
import { NotificationRepository } from "../../DB/repository/notification.repository";
import { IFormattedNotification } from "./notification.formate";
import { NotificationType } from "../../common/enums";


class notificationService {
    private notificationRepository: NotificationRepository;
    constructor() {
        this.notificationRepository = new NotificationRepository();
    }

    private formatNotification(notification: any): IFormattedNotification {
        const sender = notification.senderId;
        const ref = notification.referenceId;

        let text : string = "";
        let postId: Types.ObjectId | null = null;

        switch (notification.type) {
            case "like":
                text = `${sender.username} liked your post`;
                postId = ref?._id;
                break;

            case "comment":
                text = `${sender.username} commented: "${ref?.content}"`;
                postId = ref?.postId;
                break;

            case "reply":
                text = `${sender.username} replied: "${ref?.content}"`;
                postId = ref?.commentId?.postId;
                break;

            case "tag":
                text = `${sender.username} tagged you`;
                postId = ref?._id;
                break;

            default:
                text = "New notification";
        }

        return {
            id: notification._id,
            text,
            sender: {
                username: sender.username,
                profileImage: sender.profileImage,
            },
            postId: postId as Types.ObjectId,
            createdAt: notification.createdAt,
            isRead: notification.isRead,
        };
    }

    // -------------------------- Create Notification -----------------------------------

    public async createNotification({
        title,
        body,
        senderId,
        receiverId,
        type,
        referenceId,
        onModel,
    }: {
        title: string;
        body: string;
        senderId: Types.ObjectId;
        receiverId: Types.ObjectId;
        type: NotificationType;
        referenceId: Types.ObjectId;
        onModel: string;
    }) {
        
        await this.notificationRepository.create({
            data: {
                title,
                body,
                senderId,
                receiverId,
                type,
                referenceId,
                onModel,
            }
        })

    }

    // -------------------------- Get All Notifications -----------------------------------

    public async getAll(userId : string) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: userId },
            options : {
                sort : { createdAt : -1 },
                populate: [
                    {
                        path: "senderId",
                        select: "username profileImage"
                    },
                    {
                        path: "referenceId"
                    }
                ]
            },
        })

        const notifications = data?.map((notification) => this.formatNotification(notification));
        return notifications;
    }

    //-------------------------- Get Unread Notifications Count -----------------------------------

    public async getUnreadCount(userId : string) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: userId, isRead: false },
        })

        if (!data) {
            return 0;
        }
        return data.length;
    }

    //-------------------------- Mark Notification as Read -----------------------------------
    public async markAsRead(notificationId : string) {
        const data = await this.notificationRepository.updateOne({
            filter: { _id: notificationId },
            update: { isRead: true }
        })
        return data;
    }

}

export default new notificationService();