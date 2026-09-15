"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const block_service_1 = require("./block.service");
const validators = __importStar(require("./block.validation"));
exports.router = (0, express_1.Router)();
exports.router.post("/:blockedId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.blockValidation), async (req, res, next) => {
    try {
        const result = await block_service_1.blockService.block(req.user?._id.toString(), req.params?.blockedId?.toString());
        return res.status(201).json({
            success: true,
            message: "User blocked successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
exports.router.patch("/:blockedId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.unblockValidation), async (req, res, next) => {
    try {
        const result = await block_service_1.blockService.unblock(req.user?._id.toString(), req.params?.blockedId?.toString());
        return res.status(201).json({
            success: true,
            message: "User unblocked successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
exports.router.get("/", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.myBlockedUsersValidation), async (req, res, next) => {
    try {
        const result = await block_service_1.blockService.myBlockedUsers(req.user?._id.toString(), {
            page: req.query.page,
            size: req.query.size,
            search: req.query.search
        });
        return res.status(200).json({
            success: true,
            message: "My blocked users fetched successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
exports.router.get("/:blockedId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.isBlockedValidation), async (req, res, next) => {
    try {
        const result = await block_service_1.blockService.isBlocked(req.user?._id.toString(), req.params?.blockedId?.toString());
        return res.status(200).json({
            success: true,
            message: "User blocked status fetched successfully",
            data: result
        });
    }
    catch (error) {
        next(error);
    }
});
