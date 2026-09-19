"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockService = exports.BlockService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repository_1 = require("../../DB/repository");
const exceptions_1 = require("../../common/exceptions");
const objectId_1 = require("../../common/utils/objectId");
const enums_1 = require("../../common/enums");
class BlockService {
    blockRepository;
    userRepository;
    friendRequestRepository;
    followRepository;
    constructor() {
        this.blockRepository = new repository_1.BlockRepository();
        this.userRepository = new repository_1.UserRepository();
        this.friendRequestRepository = new repository_1.FriendRequestRepository();
        this.followRepository = new repository_1.FollowRepository();
    }
    async checkUser(userId) {
        const user = await this.userRepository.findOne({
            filter: {
                _id: userId,
                deletedAt: { $exists: false }
            }
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("User not found");
        }
    }
    async cancelFriendRequestBetween(userA, userB, session) {
        const request = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: userA, receiverId: userB },
                    { senderId: userB, receiverId: userA }
                ],
                status: { $in: [enums_1.FriendRequestStatusEnum.PENDING, enums_1.FriendRequestStatusEnum.ACCEPTED] },
                deletedAt: { $exists: false }
            }
        });
        if (!request)
            return;
        const wasAccepted = request.status === enums_1.FriendRequestStatusEnum.ACCEPTED;
        await this.friendRequestRepository.findOneAndUpdate({
            filter: { _id: request._id },
            update: { status: enums_1.FriendRequestStatusEnum.CANCELLED, deletedAt: new Date() },
            options: { session }
        });
        if (wasAccepted) {
            await this.userRepository.findOneAndUpdate({
                filter: { _id: request.senderId },
                update: { $inc: { friendsCount: -1 } },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: request.receiverId },
                update: { $inc: { friendsCount: -1 } },
                options: { session }
            });
        }
    }
    async cancelFollowBetween(userA, userB, session) {
        const follows = await this.followRepository.findAll({
            filter: {
                $or: [
                    { followerId: userA, followingId: userB },
                    { followerId: userB, followingId: userA }
                ],
                isDeleted: { $exists: false }
            }
        });
        for (const follow of (follows || [])) {
            await this.followRepository.findOneAndUpdate({
                filter: { _id: follow._id },
                update: { isDeleted: true },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: follow.followerId },
                update: { $inc: { followingCount: -1 } },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: follow.followingId },
                update: { $inc: { followersCount: -1 } },
                options: { session }
            });
        }
    }
    async block(blockerId, blockedId) {
        if (blockerId.toString() === blockedId.toString()) {
            throw new exceptions_1.BadRequestException("You cannot block yourself");
        }
        blockedId = (0, objectId_1.toObjectId)(blockedId);
        blockerId = (0, objectId_1.toObjectId)(blockerId);
        await this.checkUser(blockedId);
        const session = await mongoose_1.default.startSession();
        let block;
        try {
            session.startTransaction();
            const isBlocked = await this.blockRepository.findOne({
                filter: { blockerId, blockedId }
            });
            if (isBlocked?.deletedAt) {
                block = await this.blockRepository.findOneAndUpdate({
                    filter: { _id: isBlocked._id },
                    update: { restoredAt: new Date(), $unset: { deletedAt: "" } },
                    options: { session, new: true }
                });
            }
            else if (!isBlocked) {
                block = await this.blockRepository.create({
                    data: { blockerId, blockedId },
                    options: { session }
                });
            }
            else {
                throw new exceptions_1.BadRequestException("You have already blocked this user");
            }
            await this.cancelFriendRequestBetween(blockerId, blockedId, session);
            await this.cancelFollowBetween(blockerId, blockedId, session);
            await session.commitTransaction();
        }
        catch (error) {
            if (session.inTransaction())
                await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        return block;
    }
    async unblock(blockerId, blockedId) {
        if (blockerId.toString() === blockedId.toString()) {
            throw new exceptions_1.BadRequestException("You cannot unblock yourself");
        }
        blockedId = (0, objectId_1.toObjectId)(blockedId);
        blockerId = (0, objectId_1.toObjectId)(blockerId);
        await this.checkUser(blockedId);
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: blockerId, blockedId: blockedId,
            }
        });
        if (!isBlocked || isBlocked?.deletedAt) {
            throw new exceptions_1.BadRequestException("You have not blocked this user");
        }
        const block = await this.blockRepository.findOneAndUpdate({
            filter: {
                blockerId: blockerId, blockedId: blockedId
            },
            update: {
                deletedAt: new Date(),
            },
            options: {
                new: true
            }
        });
        return block;
    }
    async myBlockedUsers(blockerId, { page, size, search }) {
        page = page ?? 1;
        size = size ?? 10;
        search = search ?? "";
        const blockedList = await this.blockRepository.paginate({
            filter: {
                blockerId: blockerId,
                deletedAt: { $exists: false }
            },
            page,
            size,
            options: {
                populate: [
                    { path: "blockedId", select: "firstName lastName userName profileImageUrl" }
                ]
            }
        });
        if (search) {
            const searchLower = search.toLowerCase();
            blockedList.docs = blockedList.docs.filter((block) => `${block.blockedId?.firstName} ${block.blockedId?.lastName} ${block.blockedId?.userName}`
                .toLowerCase()
                .includes(searchLower));
        }
        return blockedList;
    }
    async isBlocked(blockerId, blockedId) {
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: (0, objectId_1.toObjectId)(blockerId),
                blockedId: (0, objectId_1.toObjectId)(blockedId),
                deletedAt: { $exists: false }
            }
        });
        return !!isBlocked;
    }
}
exports.BlockService = BlockService;
exports.blockService = new BlockService();
