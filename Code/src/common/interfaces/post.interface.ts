import { Types } from "mongoose";

export interface IPost{
    content?: string;
    attachments?: {secure_url:string,public_id:string}[];
    likes?: Types.ObjectId[];
    tags?: Types.ObjectId[];
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}