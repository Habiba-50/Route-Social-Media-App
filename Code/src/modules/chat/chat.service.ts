import { HydratedDocument, Types } from "mongoose";
import {  NotFoundException } from "../../common/exceptions";
import { IChat, IUser } from "../../common/interfaces";
import { toObjectId } from "../../common/utils/objectId";
import { ChatRepository } from "../../DB/repository/chat.repository";
import { ChatEnum } from "../../common/enums";
import { UserRepository } from "../../DB/repository/user.repository";
import { s3Service } from "../../common/services"; 
import { randomUUID } from "node:crypto";
import { friendRequestService, FriendRequestService } from "../friendRequest";

export class ChatService {
    private chatRepository: ChatRepository
    private userRepository: UserRepository
    private s3Service: typeof s3Service
    private friendRequestService: FriendRequestService
    constructor() {
        this.chatRepository = new ChatRepository()
        this.userRepository = new UserRepository()
        this.s3Service = s3Service
        this.friendRequestService = friendRequestService
    }

    // --------------------------- Get Chat -----------------------------------

    async getChat(participantId: string, { page, size }: { page?: string; size?: string } = {}, user: HydratedDocument<IUser>): Promise<IChat | undefined> {
        const chat = await this.chatRepository.findOneChat({
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
            },
            page,
            size
        })
       
        if (!chat) {
          
            throw new NotFoundException("Chat not found")
        }

        return chat
    }

    // --------------------------- Send Message -----------------------------------
    
    async sendMessage({ sendTo, content }: { sendTo: string, content: string }, user: HydratedDocument<IUser>): Promise<void> {
       
        // Update the chat if exists
        let chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                participants: {
                    $all: [toObjectId(sendTo), user._id]
                },
                deletedAt: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        createdBy: user._id,
                        content
                    }
                }
            }
            // options: {
            //     new: true,
            //     upsert: true,
            //     populate: [
            //         {
            //             path: "participants",
            //             select: "username" 
            //         }
            //     ]
            // }
        })

        if (!chat) {
            console.log("Chat not found");
            chat = await this.chatRepository.create({
                data: {
                    participants: [toObjectId(sendTo), user._id],
                    createdBy: user._id,
                    type:ChatEnum.OVO,
                    messages: [
                        {
                            createdBy: user._id,
                            content
                        }
                    ]
                }
            })
        }
        
    }

    // --------------------------- Create Group Chat -----------------------------------
    async createGroupChat(body: { groupName: string, participantsIds: string[] | Types.ObjectId[] }, user: HydratedDocument<IUser>, file?: Express.Multer.File,): Promise<IChat | undefined>{
    
        const participantsIds = [... new Set(body.participantsIds.map((id) => toObjectId(id as string)))]
        // To get a unique list of users 
        console.log("Current user:", user._id.toString());
        console.log("Participants:", participantsIds.map(id => id.toString()));

        // check if all participants exist in DB ( not deleted )
        const users = await this.userRepository.findAll({
            filter: { _id: { $in: participantsIds }, deletedAt: { $exists: false } }
        });
        if (users?.length !== participantsIds.length) {
            throw new NotFoundException("Some participants no longer exist");
        }

        // Check if all participants are friends ( with the creator )
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(user._id);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));

        const allParticipantsAreFriends = participantsIds.every((id) =>
            friendIdSet.has(id.toString())
        );

        if (!allParticipantsAreFriends) {
            throw new NotFoundException("Some participants are not friends")
        }


        // Upload group icon if provided
        let group_image: string | undefined;
        const roomId = randomUUID()
        const path = `chat/group/${roomId}`

        if (file) {
        group_image = (await this.s3Service.uploadAsset({
            path,
            file
        }));
        
        }
        
        // Create the group chat
        const chatingGroup = await this.chatRepository.create({
        data: {
            participants: [...participantsIds , user._id],
            createdBy: user._id,
            type:ChatEnum.OVM,
            groupName:body.groupName,
            groupIcon:group_image,
            roomId,
            messages: [
                {
                    createdBy: user._id,
                    content:"Group Created"
                }
            ]
        }
        })

        return chatingGroup
    }

    // --------------------------- Get Group Chat -----------------------------------

    async getGroupChat(groupId: string, { page, size }: { page?: string; size?: string } = {}, user: HydratedDocument<IUser>): Promise<IChat | undefined> {
        const chat = await this.chatRepository.findOneChat({
            filter:
            {
                _id: toObjectId(groupId),
                participants: { $in: [user._id] },
                type:ChatEnum.OVM,
            },
            options: {
                populate: [
                    {
                        path: "participants", 
                        select:"username profilePicture"  
                    },
                    {
                        path:"messages.createdBy",
                    }
                ]
            },
            page,
            size
        })

        // console.log("chat",chat);

        if (!chat) {

            throw new NotFoundException("Chat not found")
        }

        return chat
    }
    
    // ----------------------------- Send Group Message -----------------------------------

    async sendGroupMessage({ groupId, content }: { groupId: string, content: string }, user: HydratedDocument<IUser>): Promise<string> {
       
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: toObjectId(groupId),
                participants: { $in: [user._id] },
                type: ChatEnum.OVM,
                deletedAt: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        createdBy: user._id,
                        content
                    }
                }
            }
        })
        if (!chat) {
            throw new NotFoundException("Fail to send message in group.")
        }

        return chat.roomId
    }


}

export const chatService = new ChatService()