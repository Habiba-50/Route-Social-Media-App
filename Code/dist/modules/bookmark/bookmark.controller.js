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
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const bookmark_service_1 = require("./bookmark.service");
const validators = __importStar(require("./bookmark.validation"));
const router = (0, express_1.Router)();
router.post("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.savePostValidation), async (req, res, next) => {
    const result = await bookmark_service_1.bookmarkService.savePost(req.user, req.params.postId);
    res.status(200).json({
        success: true,
        message: "Post saved successfully",
        data: result
    });
});
router.patch("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.savePostValidation), async (req, res, next) => {
    const result = await bookmark_service_1.bookmarkService.unsavePost(req.user, req.params.postId);
    res.status(200).json({
        success: true,
        message: "Post unsaved successfully",
        data: result
    });
});
router.get("/", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.mySavedPostsValidation), async (req, res, next) => {
    const result = await bookmark_service_1.bookmarkService.mySavedPosts(req.user, {
        page: Number(req.query?.page),
        size: Number(req.query?.limit),
    });
    res.status(200).json({
        success: true,
        message: "My saved posts",
        data: result
    });
});
router.get("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.savePostValidation), async (req, res, next) => {
    const result = await bookmark_service_1.bookmarkService.isSavedPost(req.user, req.params.postId);
    res.status(200).json({
        success: true,
        message: "Post status",
        data: result
    });
});
exports.default = router;
