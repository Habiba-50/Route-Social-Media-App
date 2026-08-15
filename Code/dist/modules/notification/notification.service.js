"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationModuleService = exports.NotificationModuleService = void 0;
const notification_repository_1 = require("../../DB/repository/notification.repository");
const exceptions_1 = require("../../common/exceptions");
class NotificationModuleService {
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
                text = `${sender.username} commented on your post : "${ref?.content}"`;
                postId = ref?.postId;
                break;
            case "reply":
                text = `${sender.username} replied on your comment : "${ref?.content}"`;
                postId = ref?.postId;
                break;
            case "tag":
                text = `${sender.username} tagged you on your post: "${ref?.content}"`;
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
    async getNotificationList({ page, size, search, }, user) {
        const notifications = await this.notificationRepository.paginate({
            filter: {
                receiverId: user._id,
                ...(search ? { title: { $regex: search, $options: "i" }, body: { $regex: search, $options: "i" } } : {}),
            },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    { path: "senderId" },
                ]
            }
        });
        return {
            ...notifications,
            docs: (notifications.docs || []).map((notification) => this.formatNotification(notification)),
        };
    }
    async getNotificationById(notificationId, user) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id },
            update: { isRead: true },
            options: {
                populate: [
                    { path: "senderId" },
                    { path: "referenceId" },
                ]
            }
        });
        if (!data) {
            throw new exceptions_1.NotFoundException("Notification not found");
        }
        return data;
    }
    async getUnreadCount(user) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: user._id, isRead: false },
        });
        return { count: data?.length || 0 };
    }
    async markAllAsRead(user) {
        await this.notificationRepository.updateMany({
            filter: { receiverId: user._id },
            update: { isRead: true },
        });
        return { message: "All notifications marked as read" };
    }
    async getUnreadNotifications(user, { page, size }) {
        const notifications = await this.notificationRepository.paginate({
            filter: { receiverId: user._id, isRead: false },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    { path: "senderId" },
                ]
            }
        });
        return {
            ...notifications,
            docs: (notifications.docs || []).map((notification) => this.formatNotification(notification)),
        };
    }
    async deleteNotification(notificationId, user) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id, isDeleted: false },
            update: { isDeleted: true },
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        });
        if (!data) {
            throw new exceptions_1.NotFoundException("Notification not found");
        }
        return data;
    }
    async deleteAllNotifications(user) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: user._id, isDeleted: false },
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        });
        for (const notification of data) {
            await this.notificationRepository.findOneAndUpdate({
                filter: { _id: notification._id },
                update: { isDeleted: true },
            });
        }
        return { message: "All notifications deleted" };
    }
}
exports.NotificationModuleService = NotificationModuleService;
exports.notificationModuleService = new NotificationModuleService();
