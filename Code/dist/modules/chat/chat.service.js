"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.ChatService = void 0;
const exceptions_1 = require("../../common/exceptions");
const objectId_1 = require("../../common/utils/objectId");
const chat_repository_1 = require("../../DB/repository/chat.repository");
const enums_1 = require("../../common/enums");
const user_repository_1 = require("../../DB/repository/user.repository");
const services_1 = require("../../common/services");
const node_crypto_1 = require("node:crypto");
const friendRequest_1 = require("../friendRequest");
class ChatService {
    chatRepository;
    userRepository;
    s3Service;
    friendRequestService;
    constructor() {
        this.chatRepository = new chat_repository_1.ChatRepository();
        this.userRepository = new user_repository_1.UserRepository();
        this.s3Service = services_1.s3Service;
        this.friendRequestService = friendRequest_1.friendRequestService;
    }
    async getChat(participantId, { page, size } = {}, user) {
        const chat = await this.chatRepository.findOneChat({
            filter: {
                participants: { $all: [(0, objectId_1.toObjectId)(participantId), user._id] },
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
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        return chat;
    }
    async sendMessage({ sendTo, content }, user) {
        let chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                participants: {
                    $all: [(0, objectId_1.toObjectId)(sendTo), user._id]
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
        });
        if (!chat) {
            console.log("Chat not found");
            chat = await this.chatRepository.create({
                data: {
                    participants: [(0, objectId_1.toObjectId)(sendTo), user._id],
                    createdBy: user._id,
                    type: enums_1.ChatEnum.OVO,
                    messages: [
                        {
                            createdBy: user._id,
                            content
                        }
                    ]
                }
            });
        }
    }
    async createGroupChat(body, user, file) {
        const participantsIds = [...new Set(body.participantsIds.map((id) => (0, objectId_1.toObjectId)(id)))];
        const users = await this.userRepository.findAll({
            filter: { _id: { $in: participantsIds }, deletedAt: { $exists: false } }
        });
        if (users?.length !== participantsIds.length) {
            throw new exceptions_1.NotFoundException("Some participants no longer exist");
        }
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(user._id);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));
        const allParticipantsAreFriends = participantsIds.every((id) => friendIdSet.has(id.toString()));
        if (!allParticipantsAreFriends) {
            throw new exceptions_1.NotFoundException("Some participants are not friends");
        }
        let group_image;
        const roomId = (0, node_crypto_1.randomUUID)();
        const path = `chat/group/${roomId}`;
        if (file) {
            group_image = (await this.s3Service.uploadAsset({
                path,
                file
            }));
        }
        const chatingGroup = await this.chatRepository.create({
            data: {
                participants: [...participantsIds, user._id],
                createdBy: user._id,
                type: enums_1.ChatEnum.OVM,
                groupName: body.groupName,
                groupIcon: group_image,
                roomId,
                messages: [
                    {
                        createdBy: user._id,
                        content: "Group Created"
                    }
                ]
            }
        });
        return chatingGroup;
    }
    async getGroupChat(groupId, { page, size } = {}, user) {
        const chat = await this.chatRepository.findOneChat({
            filter: {
                _id: (0, objectId_1.toObjectId)(groupId),
                participants: { $in: [user._id] },
                type: enums_1.ChatEnum.OVM,
            },
            options: {
                populate: [
                    {
                        path: "participants",
                        select: "username profilePicture"
                    },
                    {
                        path: "messages.createdBy",
                    }
                ]
            },
            page,
            size
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        return chat;
    }
    async sendGroupMessage({ groupId, content }, user) {
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(groupId),
                participants: { $in: [user._id] },
                type: enums_1.ChatEnum.OVM,
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
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Fail to send message in group.");
        }
        return chat.roomId;
    }
}
exports.ChatService = ChatService;
exports.chatService = new ChatService();
