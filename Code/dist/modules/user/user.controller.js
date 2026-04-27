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
const multer_1 = require("../../common/utils/multer");
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
router.patch("/profile-image", (0, authentication_middleware_1.authentication)(), async (req, res, next) => {
    console.log("body", req.body);
    const data = await user_service_1.default.profileImagePresignedUrl(req.user, req.body);
    return (0, response_1.successResponse)({ res, data });
});
router.patch("/cover-images", (0, authentication_middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image,
    storageApproach: enums_1.StorageApproachEnum.DISK,
}).array("attachments", 2), async (req, res, next) => {
    const data = await user_service_1.default.profileCoverImages(req.user, req.files);
    return (0, response_1.successResponse)({ res, data });
});
router.delete("/delete/:userId", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.deleteUser(req.params.userId);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User deleted successfully", data });
});
router.patch("/restore/:userId", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.restoreUser(req.params.userId);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User restored successfully", data });
});
router.get("/all", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/deleted", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllDeletedUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/active", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllActiveUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/update", (0, authentication_middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.updateProfile(req.user, req.body);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete("/destroy/:userId", (0, authentication_middleware_1.authentication)(), (0, authentication_middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    await user_service_1.default.hardDeleteUser(req.params.userId, req.body.force);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User deleted successfully" });
});
exports.default = router;
