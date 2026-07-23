import { HydratedDocument } from "mongoose";
import {  NotFoundException } from "../../common/exceptions";
import { IChat, IUser } from "../../common/interfaces";
import { toObjectId } from "../../common/utils/objectId";
import { ChatRepository } from "../../DB/repository/chat.repository";

export class ChatService {
    private chatRepository: ChatRepository
    constructor() {
        this.chatRepository = new ChatRepository()
    }

    async getChat(participantId: string, user: HydratedDocument<IUser>): Promise<IChat | undefined> {
        const chat = await this.chatRepository.findOne({
            filter:
            {
                participants: { $all: [toObjectId(participantId), user._id] },
                deletedAt: { $exists: false }
            },
            options: {
                populate: [
                    {
                        path: "participants",
                           
                    }
                ]
            }
        },
        
        )
       
        if (!chat) {
          
            throw new NotFoundException("Chat not found")
        }

        return chat
    }

}

export const chatService = new ChatService()