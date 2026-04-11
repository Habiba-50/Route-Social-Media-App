"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authentication_middleware_1 = require("../../middleware/authentication.middleware");
const response_1 = require("../../common/response");
const user_service_1 = __importDefault(require("./user.service"));
const user_authorization_1 = require("./user.authorization");
const enums_1 = require("../../common/enums");
const router = (0, express_1.Router)();
router.get("/", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.profile), async (req, res, next) => {
    const data = await user_service_1.default.profile(req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.post("/rotate-token", (0, authentication_middleware_1.authentication)(enums_1.TokenTypeEnum.REFRESH), async (req, res, next) => {
    const data = await user_service_1.default.rotateToken(req.user, req.decoded, `${req.protocol}://${req.host}`);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.post("/logout", (0, authentication_middleware_1.authentication)(), async (req, res, next) => {
    const status = await user_service_1.default.logout(req.body.flag, req.user, req.decoded);
    return (0, response_1.successResponse)({ res, statusCode: status, data: { message: "Logged out successfully" } });
});
exports.default = router;
