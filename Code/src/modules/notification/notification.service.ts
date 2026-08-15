import { Types } from "mongoose";
import { NotificationRepository } from "../../DB/repository/notification.repository";
import { IFormattedNotification } from "./notification.formate";
import { NotificationType } from "../../common/enums";
import { IPaginate, IUser } from "../../common/interfaces";
import { NotFoundException } from "../../common/exceptions";


export class NotificationModuleService {
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
                text = `${sender.username} commented on your post : "${ref?.content}"`;
                postId = ref?.postId;
                break;

            // case "reply":
            //     text = `${sender.username} replied: "${ref?.content}"`;
            //     postId = ref?.commentId?.postId;
            //     break;
            
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
        referenceId?: Types.ObjectId;
        onModel?: string;
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

    // -------------------------- Get All Notifications with Pagination -----------------------------------

      public async getNotificationList(
        {
          page,
          size,
          search,
        }: {
          page: number | string | undefined;
          size: number | string | undefined;
          search?: string | undefined;
        },
        user: IUser & { _id: Types.ObjectId },
      ): Promise<IPaginate<any>> {
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
            //   {
            //     path: "comments",
            //     populate: [
            //       {
            //         path: "replies",
            //         populate: [
            //           {
            //             path: "replies",
            //           },
            //         ],
            //       },
            //     ],
            //   },
            ]
          }
        });
    
        return {
          ...notifications,
          docs: (notifications.docs || []).map((notification) => this.formatNotification(notification)),
        };
    }
    
    // ---------------------------- Get Notification By Id ------------------------------------------
    public async getNotificationById(notificationId : string, user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id },
            update: { isRead: true },
            options: {
                populate: [
                    { path: "senderId" },
                    { path: "referenceId" },
                ]
            }
        })
        if (!data) {
            throw new NotFoundException("Notification not found");
        }
        return data;
    }

    //-------------------------- Get Unread Notifications Count -----------------------------------

    public async getUnreadCount(user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: user._id, isRead: false },
        })

        return { count: data?.length || 0 };
    }

    // -------------------------- Mark All Notifications as Read -----------------------------------
    public async markAllAsRead(user: IUser & { _id: Types.ObjectId }) {
        await this.notificationRepository.updateMany({
            filter: { receiverId: user._id },
            update: { isRead: true },
        })

        return { message: "All notifications marked as read" };
    }

    // -------------------------- Get Unread Notifications paginated -----------------------------------
    public async getUnreadNotifications(
        user: IUser & { _id: Types.ObjectId },
        { page, size }: { page: number | string | undefined; size: number | string | undefined },
    ) {
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

    // -------------------------- Delete Notification -----------------------------------
    public async deleteNotification(notificationId: string, user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id, isDeleted: false },
            update: { isDeleted: true },
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        })
        if (!data) {
            throw new NotFoundException("Notification not found");
        }
        return data;
    }

    // -------------------------- Delete All Notifications -----------------------------------
    public async deleteAllNotifications(user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findAll({
            filter: { receiverId: user._id , isDeleted: false},
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        })
        
        for (const notification of data as any) {
            await this.notificationRepository.findOneAndUpdate({
                filter: { _id: notification._id },
                update: { isDeleted: true },
            })
        }
        return { message: "All notifications deleted" };
    }

    
   

}

export const notificationModuleService = new NotificationModuleService();