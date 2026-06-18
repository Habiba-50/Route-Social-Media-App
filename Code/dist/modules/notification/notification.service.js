"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_repository_1 = require("../../DB/repository/notification.repository");
class notificationService {
    notificationRepository;
    constructor() {
        this.notificationRepository = new notification_repository_1.NotificationRepository();
    }
    formatNotification(notification) {
        const sender = notification.senderId;
        const ref = notification.referenceId;
        let text = "";
        let postId = null;
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
            postId: postId,
            createdAt: notification.createdAt,
            isRead: notification.isRead,
        };
    }
    async createNotification({ title, body, senderId, receiverId, type, referenceId, onModel, }) {
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
        });
    }
    async getAll(userId) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: userId },
            options: {
                sort: { createdAt: -1 },
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
        });
        const notifications = data?.map((notification) => this.formatNotification(notification));
        return notifications;
    }
    async getUnreadCount(userId) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: userId, isRead: false },
        });
        if (!data) {
            return 0;
        }
        return data.length;
    }
    async markAsRead(notificationId) {
        const data = await this.notificationRepository.updateOne({
            filter: { _id: notificationId },
            update: { isRead: true }
        });
        return data;
    }
}
exports.default = new notificationService();
