"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockService = exports.BlockService = void 0;
const repository_1 = require("../../DB/repository");
const exceptions_1 = require("../../common/exceptions");
const objectId_1 = require("../../common/utils/objectId");
class BlockService {
    blockRepository;
    userRepository;
    constructor() {
        this.blockRepository = new repository_1.BlockRepository();
        this.userRepository = new repository_1.UserRepository();
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
    async block(blockerId, blockedId) {
        if (blockerId.toString() === blockedId.toString()) {
            throw new exceptions_1.BadRequestException("You cannot block yourself");
        }
        blockedId = (0, objectId_1.toObjectId)(blockedId);
        blockerId = (0, objectId_1.toObjectId)(blockerId);
        await this.checkUser(blockedId);
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: blockerId, blockedId: blockedId
            },
        });
        if (isBlocked && !isBlocked?.deletedAt) {
            throw new exceptions_1.BadRequestException("You have already blocked this user");
        }
        if (isBlocked && isBlocked?.deletedAt) {
            const block = await this.blockRepository.findOneAndUpdate({
                filter: {
                    _id: isBlocked._id
                },
                update: {
                    restoredAt: new Date(),
                    $unset: {
                        deletedAt: ""
                    }
                },
                options: {
                    new: true
                }
            });
            return block;
        }
        const block = await this.blockRepository.create({
            data: {
                blockerId: blockerId,
                blockedId: blockedId
            }
        });
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
