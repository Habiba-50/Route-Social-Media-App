import type { Request, Response, NextFunction } from "express";
import { Router } from "express"
import { authentication } from "../../middleware";
import followService from "./follow.service";


const router = Router()

// Follow
router.post("/:followingId",authentication(), async (req :Request, res:Response, next:NextFunction): Promise<any> => {
    try {
        const result = await followService.follow(
            req.user, 
            req.params?.followingId?.toString() as string
        )

        return res.status(201).json({
            success:true,
            message:"Followed successfully",
            data:result
        })
    } catch (error) {
        next(error)
    }
})



// Unfollow
router.patch("/:followingId", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.unFollow(
            req.user?._id.toString() as string,
            req.params?.followingId?.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "UnFollowed successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


// Get following users
router.get("/following",authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.getFollowingUsers(
            req.user?._id.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "Following users fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})

// Get followers users
router.get("/followers", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.getFollowersUsers(
            req.user?._id.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "Followers users fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


export default router;