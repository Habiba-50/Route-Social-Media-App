"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../../common/response");
const middleware_1 = require("../../middleware");
const notification_service_1 = require("./notification.service");
const router = (0, express_1.Router)();
router.get("/", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.getNotificationList({
        page: req.query.page,
        size: req.query.limit,
        search: req.query.search || undefined,
    }, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/unread", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.getUnreadNotifications(req.user, {
        page: req.query.page,
        size: req.query.limit,
    });
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/unread/count", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.getUnreadCount(req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/mark-all-as-read", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.markAllAsRead(req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/:notificationId", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.getNotificationById(req.params.notificationId, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete("/:notificationId", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.deleteNotification(req.params.notificationId, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete("/", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.notificationModuleService.deleteAllNotifications(req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
