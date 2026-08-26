import { Router } from "express";
import { friendRequestService } from "./friendRequest.service";
import { authentication } from "../../middleware";
import type { Request, Response, NextFunction } from "express";


const router = Router()

//Send Request

router.post("/:receiverId", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    console.log("Hello")
    const sendRequest = await friendRequestService.sendFriendRequest(
        req.user,
        req.params?.receiverId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request sent successfully",
        data: sendRequest
    })
})



// ----------------------------------------------------------------------------

//Accept Request

router.patch("/:requestId/accept", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const sendRequest = await friendRequestService.acceptFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request accepted successfully",
        data: sendRequest
    })
})

// -----------------------------------------------------------------------------

//Reject Request

router.patch("/:requestId/reject", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const rejectRequest = await friendRequestService.rejectFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request rejected successfully",
        data: rejectRequest
    })
})

// -----------------------------------------------------------------------------

//Cancel Pending Request

router.patch("/:requestId/cancel", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const cancelRequest = await friendRequestService.cancelFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request cancelled successfully",
        data: cancelRequest
    })
})

// -----------------------------------------------------------------------------

//Unfriend

//prevent unfriend if they are not friends (status = accepted)
router.patch("/:requestId/unfriend", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const cancelRequest = await friendRequestService.unfriend(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Unfriended successfully",
        data: cancelRequest
    })
})

// -----------------------------------------------------------------------------

// Check the  status between two users

router.get("/:friendId/status", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const status = await friendRequestService.checkStatus(
        req.user,
        req.params?.friendId as string
    )
    return res.status(200).json({
        success: true,
        message: "Status checked",
        data: status
    })
})


// -----------------------------------------------------------------------------

//Get Friend Requests
//sent
router.get("/requests-sent", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const friendRequests = await friendRequestService.GetPendingFriendRequestsSent(
        req.user,
        {
            page: Number(req.query?.page),
            size: Number(req.query?.size)
        }
    )
    return res.status(200).json({
        success: true,
        message: "Requests sent successfully",
        data: friendRequests
    })
})

// -----------------------------------------------------------------------------

//Get Incoming Friend Requests

router.get("/requests-received", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const friendRequests = await friendRequestService.GetPendingFriendRequestsReceived(
        req.user,
        {
            page: Number(req.query?.page),
            size: Number(req.query?.size)
        }
    )
    return res.status(200).json({
        success: true,
        message: "Requests received successfully",
        data: friendRequests
    })
})

// -----------------------------------------------------------------------------

//Get Friends

router.get("/my-friends", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const friends = await friendRequestService.getMyFriends(
        req.user,
        {
            page: Number(req.query?.page),
            size: Number(req.query?.size)
        }
    )
    return res.status(200).json({
        success: true,
        message: "Friends successfully",
        data: friends
    })
})


export default router
