import { Types } from "mongoose";

export interface IFormattedNotification {
    id: string;
    text: string;
    sender: {
        username: string;
        profileImage?: string;
    };
    postId: Types.ObjectId;
    createdAt: Date;
    isRead: boolean;
}


