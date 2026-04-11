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
const auth_service_1 = __importDefault(require("./auth.service"));
const response_1 = require("../../common/response");
const validators = __importStar(require("./auth.validation"));
const middleware_1 = require("../../middleware");
const router = (0, express_1.Router)();
router.post("/signup", (0, middleware_1.validation)(validators.signup), async (req, res, next) => {
    const data = await auth_service_1.default.signup(req.body);
    return (0, response_1.successResponse)({ res, statusCode: 201, data });
});
router.patch("/confirm-email", (0, middleware_1.validation)(validators.confirmEmail), async (req, res, next) => {
    await auth_service_1.default.confirmEmail(req.body);
    return (0, response_1.successResponse)({ res, statusCode: 201, data: "Email confirmed successfully" });
});
router.patch("/resend-otp", (0, middleware_1.validation)(validators.email), async (req, res, next) => {
    await auth_service_1.default.resendOtp(req.body);
    return (0, response_1.successResponse)({ res, statusCode: 201, data: "A new OTP has been sent to your email" });
});
router.post("/login", (0, middleware_1.validation)(validators.login), async (req, res, next) => {
    const data = await auth_service_1.default.login(req.body, req.headers.host);
    return (0, response_1.successResponse)({ res, statusCode: 201, data });
});
router.post("/signup/gmail", async (req, res, next) => {
    console.log(req.body);
    const { account, status } = await auth_service_1.default.signupGmail(req.body.idToken, `${req.protocol}://${req.host}`);
    return (0, response_1.successResponse)({ res, statusCode: status, data: { account } });
});
router.post("/login/gmail", async (req, res, next) => {
    console.log(req.body);
    const credentials = await auth_service_1.default.loginGmail(req.body, `${req.protocol}://${req.host}`);
    return (0, response_1.successResponse)({ res, statusCode: 201, data: { ...credentials } });
});
router.post("/forgot-password-otp", (0, middleware_1.validation)(validators.email), async (req, res, next) => {
    const { email } = req.body;
    const result = await auth_service_1.default.forgetPassword(email);
    return (0, response_1.successResponse)({ res, statusCode: 200, data: { result }, message: "If the email exists, a reset password OTP has been sent" });
});
router.post("/verify-otp-password", (0, middleware_1.validation)(validators.confirmEmail), async (req, res, next) => {
    const { email, otp } = req.body;
    const result = await auth_service_1.default.verifyForgetPasswordOtp(email, otp);
    return (0, response_1.successResponse)({ res, statusCode: 200, data: { result }, message: "you can now reset your password" });
});
router.patch("/reset-password", (0, middleware_1.validation)(validators.resetPassword), async (req, res, next) => {
    const { email, password } = req.body;
    const result = await auth_service_1.default.resetPassword(email, password);
    return (0, response_1.successResponse)({ res, statusCode: 200, data: { result }, message: "Password reset successfully" });
});
exports.default = router;
