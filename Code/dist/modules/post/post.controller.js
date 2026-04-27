"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const post_authorization_1 = require("./post.authorization");
const post_service_1 = __importDefault(require("./post.service"));
const response_1 = require("../../common/response");
const router = (0, express_1.Router)();
router.post('/', (0, middleware_1.authentication)(), (0, middleware_1.authorization)(post_authorization_1.postAuthorization.createPost), async (req, res, next) => {
    const data = await post_service_1.default.createPost(req.body, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 201, data });
});
router.patch('/:id', (0, middleware_1.authentication)(), (0, middleware_1.authorization)(post_authorization_1.postAuthorization.updatePost), async (req, res, next) => {
    const data = await post_service_1.default.updatePost(req.params.id, req.body, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete('/:id', (0, middleware_1.authentication)(), (0, middleware_1.authorization)(post_authorization_1.postAuthorization.deletePost), async (req, res, next) => {
    const data = await post_service_1.default.deletePost(req.params.id);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get('/:id', (0, middleware_1.authentication)(), (0, middleware_1.authorization)(post_authorization_1.postAuthorization.getPost), async (req, res, next) => {
    const data = await post_service_1.default.getPost(req.params.id);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
