import { HydratedDocument, Types } from "mongoose";
import { BlockRepository, UserRepository } from "../../DB/repository";
import { IBlock, IPaginate } from "../../common/interfaces";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { toObjectId } from "../../common/utils/objectId";


export class BlockService {

    private readonly blockRepository: BlockRepository;
    private readonly userRepository: UserRepository;

    constructor() {
        this.blockRepository = new BlockRepository();
        this.userRepository = new UserRepository();
    }

    // Check User Exists
    public async checkUser(userId: Types.ObjectId) {
        const user = await this.userRepository.findOne({
            filter: {
                _id: userId,
                deletedAt: { $exists: false }
            }
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }
    }

    // ------------------------ Block user ✅ --------------------------------

    public async block(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<HydratedDocument<IBlock> & { _id: Types.ObjectId }> {

        // check if the user i want to block is me
        if (blockerId.toString() === blockedId.toString()) {
            throw new BadRequestException("You cannot block yourself");
        }

        blockedId = toObjectId(blockedId as string);
        blockerId = toObjectId(blockerId as string);

        await this.checkUser(blockedId as Types.ObjectId)

        // check if user is already blocked
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: blockerId, blockedId: blockedId
            },
            
        });
        if (isBlocked && !isBlocked?.deletedAt) {
            throw new BadRequestException("You have already blocked this user");
        }

        if (isBlocked && isBlocked?.deletedAt) {
            const block = await this.blockRepository.findOneAndUpdate({
                filter: {
                    _id: isBlocked._id
                },
                update:{
                    restoredAt: new Date(),
                    $unset: {
                        deletedAt: ""
                    }
                },
                options: {
                    new: true
                }
            });
            return block as HydratedDocument<IBlock> & { _id: Types.ObjectId };
        }


        // Block 
        const block = await this.blockRepository.create({
            data: {
                blockerId: blockerId,
                blockedId: blockedId
            }
        });
        return block;
    }


    // ------------------------ Unblock user ✅ ---------------------------

    public async unblock(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<HydratedDocument<IBlock> & { _id: Types.ObjectId }> {

        // -----------------------> check the ids ----------------------->
        if (blockerId.toString() === blockedId.toString()) {
            throw new BadRequestException("You cannot unblock yourself");
        }

        blockedId = toObjectId(blockedId as string);
        blockerId = toObjectId(blockerId as string);

        await this.checkUser(blockedId as Types.ObjectId)

        // -----------------------> check if user is already blocked ----------------------->
        const isBlocked = await this.blockRepository.findOne({
            filter: {
               blockerId: blockerId, blockedId: blockedId ,
            }
        });
        if (!isBlocked || isBlocked?.deletedAt) {
            throw new BadRequestException("You have not blocked this user");
        }

        // -----------------------> Unblock ----------------------->
        const block = await this.blockRepository.findOneAndUpdate({
            filter: {
                blockerId: blockerId, blockedId: blockedId
            },
            update:{
                deletedAt: new Date(),
            },
            options: {
                new : true
            }
        });
        return block as HydratedDocument<IBlock> & { _id: Types.ObjectId };
        
    }


    // ------------------- Get my blocked users(paginated) ✅ -------------------
     
    public async myBlockedUsers(blockerId: string, { page, size, search }:{page: number, size: number, search: string}): Promise<IPaginate<IBlock>> {

        const blockedList = await this.blockRepository.paginate({
            filter:{
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
        })

        if (search) {
            const searchLower = search.toLowerCase();
            blockedList.docs = blockedList.docs.filter((block: any) =>
                `${block.blockedId?.firstName} ${block.blockedId?.lastName} ${block.blockedId?.userName}`
                    .toLowerCase()
                    .includes(searchLower)
            );
        }

        // Problem: If the page has 10 results and the search filters them to 3, 
        // the pagination metadata (totalPages, etc.) will be inaccurate 
        // because it was calculated before filtering.

        // Solution: Use an Aggregation Pipeline instead of regular pagination.
        // Perform a $lookup on the User collection, then a $match on the name 
        // before the pagination itself, so that the count and pages are 100 % correct.
      
        
        return blockedList;
    }

    // ---------------------- Check Blocked OR Not ✅ --------------------------
    
    // => Check if a specific user is blocked
    public async isBlocked(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<boolean> {
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: toObjectId(blockerId as string),
                blockedId: toObjectId(blockedId as string),
                deletedAt: { $exists: false }
            }
        });
        return !!isBlocked;
    }
    

}


export const blockService = new BlockService();


