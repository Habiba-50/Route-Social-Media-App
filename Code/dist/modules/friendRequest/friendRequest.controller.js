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
exports.default = router;
