"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../../common/response");
const middleware_1 = require("../../middleware");
const notification_service_1 = __importDefault(require("./notification.service"));
const router = (0, express_1.Router)();
router.get("/", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await notification_service_1.default.getAll(req.user?._id);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
