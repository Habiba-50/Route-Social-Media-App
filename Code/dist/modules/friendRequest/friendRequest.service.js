"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRequestService = exports.FriendRequestService = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const exceptions_1 = require("../../common/exceptions");
const repository_1 = require("../../DB/repository");
const objectId_1 = require("../../common/utils/objectId");
const notification_1 = require("../notification");
const services_1 = require("../../common/services");
class FriendRequestService {
    friendRequestRepository;
    userRepository;
    notificationModuleService;
    notificationService;
    redisService;
    constructor() {
        this.friendRequestRepository = new repository_1.FriendRequestRepository();
        this.userRepository = new repository_1.UserRepository();
        this.notificationModuleService = new notification_1.NotificationModuleService();
        this.notificationService = new services_1.NotificationService();
        this.redisService = services_1.redisService;
    }
    async sendFriendRequest(user, receiverId) {
        const userId = user._id.toString();
        if (userId === receiverId) {
            throw new exceptions_1.BadRequestException("You cannot send a friend request to yourself");
        }
        const receiverUser = await this.userRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(receiverId),
                deletedAt: { $exists: false },
            }
        });
        if (!receiverUser) {
            throw new exceptions_1.NotFoundException("Receiver user not found");
        }
        const isFriends = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: (0, objectId_1.toObjectId)(userId), receiverId: (0, objectId_1.toObjectId)(receiverId) },
                    { senderId: (0, objectId_1.toObjectId)(receiverId), receiverId: (0, objectId_1.toObjectId)(userId) }
                ]
            },
        });
        if (isFriends && isFriends.status === enums_1.FriendRequestStatusEnum.ACCEPTED) {
            throw new exceptions_1.BadRequestException("You are already friends with this user");
        }
        if (isFriends && isFriends.status === enums_1.FriendRequestStatusEnum.PENDING && isFriends.senderId.toString() === userId) {
            throw new exceptions_1.BadRequestException("You have already sent a friend request to this user");
        }
        if (isFriends && isFriends.status === enums_1.FriendRequestStatusEnum.PENDING && isFriends.receiverId.toString() === userId) {
            const session = await (0, mongoose_1.startSession)();
            let updatedFriendRequest;
            try {
                session.startTransaction();
                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriends._id
                    },
                    update: {
                        status: enums_1.FriendRequestStatusEnum.ACCEPTED,
                        updatedAt: new Date()
                    },
                    options: {
                        session
                    }
                });
                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: (0, objectId_1.toObjectId)(userId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                });
                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: (0, objectId_1.toObjectId)(receiverId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                });
                await session.commitTransaction();
            }
            catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                throw error;
            }
            finally {
                await session.endSession();
            }
            if (updatedFriendRequest) {
                try {
                    await this.notificationModuleService.createNotification({
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} accepted your friend request `,
                        senderId: (0, objectId_1.toObjectId)(userId),
                        receiverId: (0, objectId_1.toObjectId)(receiverId),
                        type: enums_1.NotificationType.FRIEND_REQUEST,
                        onModel: "FriendRequest",
                        referenceId: updatedFriendRequest._id,
                    });
                }
                catch (error) {
                    console.log("Failed to create notification:", error);
                }
                const receiverUserTokens = await this.redisService.getFCMs(receiverId);
                if (receiverUserTokens?.length) {
                    try {
                        await this.notificationService.sendNotifications({
                            userId: receiverId,
                            tokens: receiverUserTokens,
                            title: "Friend Request",
                            body: `${user.firstName} ${user.lastName} accepted your friend request`,
                            entityId: updatedFriendRequest._id.toString(),
                            entityType: "friend_request",
                            senderId: user._id.toString(),
                            type: enums_1.NotificationType.FRIEND_REQUEST,
                        });
                    }
                    catch (error) {
                        console.log("Failed to send notification:", error);
                    }
                }
            }
            return updatedFriendRequest;
        }
        if (isFriends?.status === enums_1.FriendRequestStatusEnum.CANCELLED || isFriends?.status === enums_1.FriendRequestStatusEnum.REJECTED) {
            const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                filter: {
                    _id: isFriends._id
                },
                update: {
                    status: enums_1.FriendRequestStatusEnum.PENDING,
                    updatedAt: new Date()
                }
            });
            return updatedFriendRequest;
        }
        const result = await this.friendRequestRepository.create({
            data: {
                senderId: (0, objectId_1.toObjectId)(userId),
                receiverId: (0, objectId_1.toObjectId)(receiverId),
                status: enums_1.FriendRequestStatusEnum.PENDING
            },
        });
        if (result) {
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} sent you a friend request`,
                    senderId: (0, objectId_1.toObjectId)(userId),
                    receiverId: (0, objectId_1.toObjectId)(receiverId),
                    type: enums_1.NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: result._id,
                });
            }
            catch (error) {
                console.log("Failed to create notification:", error);
            }
            const receiverUserTokens = await this.redisService.getFCMs(receiverId);
            if (receiverUserTokens?.length) {
                try {
                    await this.notificationService.sendNotifications({
                        userId: receiverId,
                        tokens: receiverUserTokens,
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} sent you a friend request`,
                        entityId: result._id.toString(),
                        entityType: "friend_request",
                        senderId: user._id.toString(),
                        type: enums_1.NotificationType.FRIEND_REQUEST,
                    });
                }
                catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }
        return result;
    }
    async acceptFriendRequest(user, friendRequestId) {
        const userId = user._id.toString();
        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(friendRequestId),
                receiverId: (0, objectId_1.toObjectId)(userId),
                status: enums_1.FriendRequestStatusEnum.PENDING
            },
        });
        if (!isFriendRequest)
            throw new exceptions_1.NotFoundException("Friend request not found");
        if (isFriendRequest) {
            const session = await (0, mongoose_1.startSession)();
            let updatedFriendRequest;
            try {
                session.startTransaction();
                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest._id
                    },
                    update: {
                        status: enums_1.FriendRequestStatusEnum.ACCEPTED,
                        updatedAt: new Date()
                    },
                    options: {
                        session
                    }
                });
                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: (0, objectId_1.toObjectId)(userId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                });
                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest?.senderId
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                });
                await session.commitTransaction();
            }
            catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                throw error;
            }
            finally {
                await session.endSession();
            }
            if (updatedFriendRequest) {
                try {
                    await this.notificationModuleService.createNotification({
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} accepted your friend request `,
                        senderId: (0, objectId_1.toObjectId)(userId),
                        receiverId: isFriendRequest?.senderId,
                        type: enums_1.NotificationType.FRIEND_REQUEST,
                        onModel: "FriendRequest",
                        referenceId: updatedFriendRequest._id,
                    });
                }
                catch (error) {
                    console.log("Failed to create notification:", error);
                }
                const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
                if (receiverUserTokens?.length) {
                    try {
                        await this.notificationService.sendNotifications({
                            userId: isFriendRequest?.senderId,
                            tokens: receiverUserTokens,
                            title: "Friend Request",
                            body: `${user.firstName} ${user.lastName} accepted your friend request`,
                            entityId: updatedFriendRequest._id.toString(),
                            entityType: "friend_request",
                            senderId: user._id.toString(),
                            type: enums_1.NotificationType.FRIEND_REQUEST,
                        });
                    }
                    catch (error) {
                        console.log("Failed to send notification:", error);
                    }
                }
            }
            return updatedFriendRequest;
        }
    }
    async rejectFriendRequest(user, friendRequestId) {
        const userId = user._id.toString();
        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(friendRequestId),
                receiverId: (0, objectId_1.toObjectId)(userId),
                status: enums_1.FriendRequestStatusEnum.PENDING
            },
        });
        if (!isFriendRequest)
            throw new exceptions_1.NotFoundException("Friend request not found");
        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: enums_1.FriendRequestStatusEnum.REJECTED,
                updatedAt: new Date()
            }
        });
        if (updatedFriendRequest) {
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} rejected your friend request `,
                    senderId: (0, objectId_1.toObjectId)(userId),
                    receiverId: isFriendRequest?.senderId,
                    type: enums_1.NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: updatedFriendRequest._id,
                });
            }
            catch (error) {
                console.log("Failed to create notification:", error);
            }
            const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
            if (receiverUserTokens?.length) {
                try {
                    await this.notificationService.sendNotifications({
                        userId: isFriendRequest?.senderId,
                        tokens: receiverUserTokens,
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} rejected your friend request`,
                        entityId: updatedFriendRequest._id.toString(),
                        entityType: "friend_request",
                        senderId: user._id.toString(),
                        type: enums_1.NotificationType.FRIEND_REQUEST,
                    });
                }
                catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }
        return updatedFriendRequest;
    }
    async cancelFriendRequest(user, friendRequestId) {
        const userId = user._id.toString();
        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: (0, objectId_1.toObjectId)(friendRequestId),
                senderId: (0, objectId_1.toObjectId)(userId),
                status: enums_1.FriendRequestStatusEnum.PENDING
            },
        });
        if (!isFriendRequest)
            throw new exceptions_1.NotFoundException("Friend request not found");
        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: enums_1.FriendRequestStatusEnum.CANCELLED,
                deletedAt: new Date()
            }
        });
        return updatedFriendRequest;
    }
}
exports.FriendRequestService = FriendRequestService;
exports.friendRequestService = new FriendRequestService();
