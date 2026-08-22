import { HydratedDocument, startSession, Types } from "mongoose";
import { FriendRequestStatusEnum, NotificationType } from "../../common/enums";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { FriendRequestRepository, UserRepository } from "../../DB/repository";
import { IFriendRequest } from "../../common/interfaces";
import { toObjectId } from "../../common/utils/objectId";
import { NotificationModuleService } from "../notification";
import { NotificationService, redisService, RedisService } from "../../common/services";


export class FriendRequestService {

    private readonly friendRequestRepository: FriendRequestRepository
    private readonly userRepository: UserRepository
    private readonly notificationModuleService: NotificationModuleService
    private readonly notificationService: NotificationService
    private readonly redisService: RedisService

    constructor() {
        this.friendRequestRepository = new FriendRequestRepository()
        this.userRepository = new UserRepository()
        this.notificationModuleService = new NotificationModuleService()
        this.notificationService = new NotificationService()
        this.redisService = redisService
    }

    // --------------------------Send Request ✅✅ --------------------------------

    public async sendFriendRequest(user: any, receiverId: string) {

        const userId = user._id.toString()
        //prevent user from sending request to himself ✅
        if (userId === receiverId) {
            throw new BadRequestException("You cannot send a friend request to yourself")
        }


        const receiverUser = await this.userRepository.findOne({
            filter: {
                _id: toObjectId(receiverId),
                deletedAt: { $exists: false },
            }
        })

        if (!receiverUser) {
            throw new NotFoundException("Receiver user not found")
        }


        const isFriends = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: toObjectId(userId), receiverId: toObjectId(receiverId) },
                    { senderId: toObjectId(receiverId), receiverId: toObjectId(userId) }
                ]
            },
        })

        //prevent user from sending request to someone who he is already friends with ✅
        if (isFriends && isFriends.status === FriendRequestStatusEnum.ACCEPTED) {
            throw new BadRequestException("You are already friends with this user")
        }


        //prevent user from sending request to someone who he has already sent request to ✅
        if (isFriends && isFriends.status === FriendRequestStatusEnum.PENDING && isFriends.senderId.toString() === userId) {
            throw new BadRequestException("You have already sent a friend request to this user")
        }


        //Auto accept if I sent a request to someone who has already sent me a request ✅ 
        if (isFriends && isFriends.status === FriendRequestStatusEnum.PENDING && isFriends.receiverId.toString() === userId) {

            const session = await startSession()

            let updatedFriendRequest: HydratedDocument<IFriendRequest> & { _id: Types.ObjectId } | any

            try {

                session.startTransaction()

                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriends._id
                    },
                    update: {
                        status: FriendRequestStatusEnum.ACCEPTED,
                        updatedAt: new Date()
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: toObjectId(userId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: toObjectId(receiverId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                })

                await session.commitTransaction()

                // return updatedFriendRequest;

            } catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction()
                }
                throw error
            } finally {
                await session.endSession()
            }

            // Sending Notifications

            if (updatedFriendRequest) {
                // store Notification
                try {
                    await this.notificationModuleService.createNotification({
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} accepted your friend request `,
                        senderId: toObjectId(userId),
                        receiverId: toObjectId(receiverId),
                        type: NotificationType.FRIEND_REQUEST,
                        onModel: "FriendRequest",
                        referenceId: updatedFriendRequest._id,
                    });
                } catch (error) {
                    console.log("Failed to create notification:", error);
                }


                // send Notification
                const receiverUserTokens = await this.redisService.getFCMs(receiverId);
                // console.log("tokens", receiverUserTokens)
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
                            type: NotificationType.FRIEND_REQUEST,
                        });
                    } catch (error) {
                        console.log("Failed to send notification:", error);
                    }
                }

            }
            return updatedFriendRequest;
        }

        //Resend request if it was cancelled or rejected 
        if (isFriends?.status === FriendRequestStatusEnum.CANCELLED || isFriends?.status === FriendRequestStatusEnum.REJECTED) {
            const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                filter: {
                    _id: isFriends._id
                },
                update: {
                    status: FriendRequestStatusEnum.PENDING,
                    updatedAt: new Date()
                }
            })
            return updatedFriendRequest;
        }

        // Create a new friend request document 
        const result = await this.friendRequestRepository.create({
            data: {
                senderId: toObjectId(userId),
                receiverId: toObjectId(receiverId),
                status: FriendRequestStatusEnum.PENDING
            },

        })

        // Sending Notifications
        if (result) {
            // store Notification
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} sent you a friend request`,
                    senderId: toObjectId(userId),
                    receiverId: toObjectId(receiverId),
                    type: NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: result._id,
                });
            } catch (error) {
                console.log("Failed to create notification:", error);
            }


            // send Notification
            const receiverUserTokens = await this.redisService.getFCMs(receiverId);
            // console.log("tokens", receiverUserTokens)
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
                        type: NotificationType.FRIEND_REQUEST,
                    });
                } catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }

        return result;

    }


    // --------------------------Accept Request ✅✅ --------------------------------

    public async acceptFriendRequest(user: any, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                receiverId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        if (isFriendRequest) {
            const session = await startSession()

            let updatedFriendRequest: HydratedDocument<IFriendRequest> & { _id: Types.ObjectId } | any

            try {

                session.startTransaction()

                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest._id
                    },
                    update: {
                        status: FriendRequestStatusEnum.ACCEPTED,
                        updatedAt: new Date()
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: toObjectId(userId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                })

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
                })

                await session.commitTransaction()

                // return updatedFriendRequest;

            } catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction()
                }
                throw error
            } finally {
                await session.endSession()
            }

            // Sending Notifications

            if (updatedFriendRequest) {
                // store Notification
                try {
                    await this.notificationModuleService.createNotification({
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} accepted your friend request `,
                        senderId: toObjectId(userId),
                        receiverId: isFriendRequest?.senderId,
                        type: NotificationType.FRIEND_REQUEST,
                        onModel: "FriendRequest",
                        referenceId: updatedFriendRequest._id,
                    });
                } catch (error) {
                    console.log("Failed to create notification:", error);
                }


                // send Notification
                const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
                // console.log("tokens", receiverUserTokens)
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
                            type: NotificationType.FRIEND_REQUEST,
                        });
                    } catch (error) {
                        console.log("Failed to send notification:", error);
                    }
                }

            }
            return updatedFriendRequest;
        }


    }

    // --------------------------Reject Request ✅✅ --------------------------------

    public async rejectFriendRequest(user: any, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                receiverId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: FriendRequestStatusEnum.REJECTED,
                updatedAt: new Date()
            }
        })

        // Sending Notifications
        if (updatedFriendRequest) {
            // store Notification
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} rejected your friend request `,
                    senderId: toObjectId(userId),
                    receiverId: isFriendRequest?.senderId,
                    type: NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: updatedFriendRequest._id,
                });
            } catch (error) {
                console.log("Failed to create notification:", error);
            }


            // send Notification
            const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
            // console.log("tokens", receiverUserTokens)
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
                        type: NotificationType.FRIEND_REQUEST,
                    });
                } catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }

        }
        return updatedFriendRequest;
    }

    // -----------------------Cancel Pending Request ✅✅ ------------------------------------

    public async cancelFriendRequest(user: any, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                senderId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: FriendRequestStatusEnum.CANCELLED,
                deletedAt: new Date()
            }
        })
        return updatedFriendRequest;
    }

    // -----------------------------------------------------------------------------

    //Unfriend

    //prevent unfriend if they are not friends (status = accepted)


    // -----------------------------------------------------------------------------

    //Get Friend Requests


    // -----------------------------------------------------------------------------

    //Get Friends



}

export const friendRequestService = new FriendRequestService()