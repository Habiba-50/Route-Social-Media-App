"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const friendRequest_service_1 = require("./friendRequest.service");
const middleware_1 = require("../../middleware");
const router = (0, express_1.Router)();
router.post("/:receiverId", (0, middleware_1.authentication)(), async (req, res, next) => {
    console.log("Hello");
    const sendRequest = await friendRequest_service_1.friendRequestService.sendFriendRequest(req.user, req.params?.receiverId);
    return res.status(200).json({
        success: true,
        message: "Request sent successfully",
        data: sendRequest
    });
});
router.patch("/:requestId/accept", (0, middleware_1.authentication)(), async (req, res, next) => {
    const sendRequest = await friendRequest_service_1.friendRequestService.acceptFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request accepted successfully",
        data: sendRequest
    });
});
router.patch("/:requestId/reject", (0, middleware_1.authentication)(), async (req, res, next) => {
    const rejectRequest = await friendRequest_service_1.friendRequestService.rejectFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request rejected successfully",
        data: rejectRequest
    });
});
router.patch("/:requestId/cancel", (0, middleware_1.authentication)(), async (req, res, next) => {
    const cancelRequest = await friendRequest_service_1.friendRequestService.cancelFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request cancelled successfully",
        data: cancelRequest
    });
});
router.patch("/:requestId/unfriend", (0, middleware_1.authentication)(), async (req, res, next) => {
    const cancelRequest = await friendRequest_service_1.friendRequestService.unfriend(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Unfriended successfully",
        data: cancelRequest
    });
});
router.get("/:friendId/status", (0, middleware_1.authentication)(), async (req, res, next) => {
    const status = await friendRequest_service_1.friendRequestService.checkStatus(req.user, req.params?.friendId);
    return res.status(200).json({
        success: true,
        message: "Status checked",
        data: status
    });
});
router.get("/requests-sent", (0, middleware_1.authentication)(), async (req, res, next) => {
    const friendRequests = await friendRequest_service_1.friendRequestService.GetPendingFriendRequestsSent(req.user, {
        page: Number(req.query?.page),
        size: Number(req.query?.size)
    });
    return res.status(200).json({
        success: true,
        message: "Requests sent successfully",
        data: friendRequests
    });
});
router.get("/requests-received", (0, middleware_1.authentication)(), async (req, res, next) => {
    const friendRequests = await friendRequest_service_1.friendRequestService.GetPendingFriendRequestsReceived(req.user, {
        page: Number(req.query?.page),
        size: Number(req.query?.size)
    });
    return res.status(200).json({
        success: true,
        message: "Requests received successfully",
        data: friendRequests
    });
});
router.get("/my-friends", (0, middleware_1.authentication)(), async (req, res, next) => {
    const friends = await friendRequest_service_1.friendRequestService.getMyFriends(req.user, {
        page: Number(req.query?.page),
        size: Number(req.query?.size)
    });
    return res.status(200).json({
        success: true,
        message: "Friends successfully",
        data: friends
    });
});
exports.default = router;
