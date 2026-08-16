"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const follow_service_1 = __importDefault(require("./follow.service"));
const router = (0, express_1.Router)();
router.post("/:followingId", (0, middleware_1.authentication)(), async (req, res, next) => {
    try {
        const result = await follow_service_1.default.follow(req.user, req.params?.followingId?.toString());
        return res.status(201).json({
            success: true,
            message: "Followed successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete("/:followingId", (0, middleware_1.authentication)(), async (req, res, next) => {
    try {
        const result = await follow_service_1.default.unFollow(req.user?._id.toString(), req.params?.followingId?.toString());
        return res.status(201).json({
            success: true,
            message: "UnFollowed successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/following", (0, middleware_1.authentication)(), async (req, res, next) => {
    try {
        const result = await follow_service_1.default.getFollowingUsers(req.user?._id.toString(), {
            page: req.query?.page,
            size: req.query?.limit,
        });
        return res.status(200).json({
            success: true,
            message: "Following users fetched successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/followers", (0, middleware_1.authentication)(), async (req, res, next) => {
    try {
        const result = await follow_service_1.default.getFollowersUsers(req.user?._id.toString(), {
            page: req.query?.page,
            size: req.query?.limit,
        });
        return res.status(200).json({
            success: true,
            message: "Followers users fetched successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
