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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const post_service_1 = __importDefault(require("./post.service"));
const response_1 = require("../../common/response");
const multer_1 = require("../../common/utils/multer");
const validators = __importStar(require("./post.validation"));
const validation_1 = require("../../common/validation");
const router = (0, express_1.Router)();
router.post("/", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image
}).array("attachments", 2), (0, middleware_1.validation)(validators.createPost), async (req, res, next) => {
    const data = await post_service_1.default.createPost({
        ...req.body,
        files: req.files
    }, req.user);
    return (0, response_1.successResponse)({
        res,
        statusCode: 201,
        message: "Post created successfully",
        data
    });
});
router.patch("/:postId", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image
}).array("attachments", 2), middleware_1.normalizePostUpdate, (0, middleware_1.validation)(validators.updatePost), async (req, res, next) => {
    console.log("req.body", req.body);
    const data = await post_service_1.default.updatePost(req.params, {
        ...req.body,
        files: req.files
    }, req.user);
    return (0, response_1.successResponse)({
        res,
        statusCode: 200,
        message: "Post updated successfully",
        data
    });
});
router.patch('/:postId/react', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.reactPost), async (req, res, next) => {
    const data = await post_service_1.default.reactPost({ postId: req.params.postId }, req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get('/', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validation_1.paginationValidationSchema), async (req, res, next) => {
    const data = await post_service_1.default.getPostList(req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get('/:id', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deletePost), async (req, res, next) => {
    const data = await post_service_1.default.getPost(req.params.id, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete('/:id', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deletePost), async (req, res, next) => {
    const data = await post_service_1.default.deletePost(req.params.id, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch('/restore/:id', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deletePost), async (req, res, next) => {
    const data = await post_service_1.default.restorePost(req.params.id, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
