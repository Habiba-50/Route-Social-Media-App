"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
const security_enum_1 = require("../enums/security.enum");
const exceptions_1 = require("../exceptions");
const redis_service_1 = require("./redis.service");
const repository_1 = require("../../DB/repository");
const mongoose_1 = require("mongoose");
const crypto_1 = require("crypto");
class TokenService {
    redis;
    userRepository;
    constructor() {
        this.redis = redis_service_1.redisService;
        this.userRepository = new repository_1.UserRepository();
    }
    async signToken({ payload, secretKey = config_1.User_JWT_SECRET, options }) {
        return jsonwebtoken_1.default.sign(payload, secretKey, options);
    }
    async verifyToken({ token, secretKey = config_1.User_JWT_SECRET, }) {
        return jsonwebtoken_1.default.verify(token, secretKey);
    }
    async getTokenSignature(role) {
        let accessSignature;
        let refreshSignature;
        let audience;
        switch (role) {
            case enums_1.RoleEnum.ADMIN:
                accessSignature = config_1.System_JWT_SECRET;
                refreshSignature = config_1.System_REFRESH_JWT_SECRET;
                audience = security_enum_1.AudienceEnum.SYSTEM;
                break;
            default:
                accessSignature = config_1.User_JWT_SECRET;
                refreshSignature = config_1.User_REFRESH_JWT_SECRET;
                audience = security_enum_1.AudienceEnum.USER;
                break;
        }
        return { accessSignature, refreshSignature, audience };
    }
    async createLoginCredentials({ user, issuer }) {
        const { accessSignature, refreshSignature, audience } = await this.getTokenSignature(user.role);
        const jwtId = (0, crypto_1.randomUUID)();
        const access_token = await this.signToken({
            payload: { sub: user._id },
            secretKey: accessSignature,
            options: {
                issuer,
                audience: [security_enum_1.TokenTypeEnum.ACCESS, audience],
                expiresIn: config_1.ACCESS_TOKEN_EXPIRY,
                jwtid: jwtId,
            },
        });
        const refresh_token = await this.signToken({
            payload: { sub: user._id },
            secretKey: refreshSignature,
            options: {
                issuer,
                audience: [security_enum_1.TokenTypeEnum.REFRESH, audience],
                expiresIn: config_1.REFRESH_TOKEN_EXPIRY,
                jwtid: jwtId,
            }
        });
        return { access_token, refresh_token };
    }
    async decodeToken(token, allowedTokenType = []) {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (typeof decoded === "string" || !decoded || !Array.isArray(decoded.aud) || !decoded.aud.length) {
            throw new exceptions_1.BadRequestException("fail to decode token, aud is required");
        }
        const [tokenType, audience] = decoded.aud;
        if (!Object.values(security_enum_1.TokenTypeEnum).includes(tokenType)) {
            throw new exceptions_1.BadRequestException("Invalid token");
        }
        if (!Object.values(security_enum_1.AudienceEnum).includes(audience)) {
            throw new exceptions_1.BadRequestException("Invalid token");
        }
        if (allowedTokenType.length && !allowedTokenType.includes(tokenType)) {
            throw new exceptions_1.NotFoundException("Invalid token type");
        }
        if (decoded.jti && decoded.sub && await this.redis.get(this.redis.revokeTokenKey({ userId: decoded.sub, jti: decoded.jti }))) {
            throw new exceptions_1.unauthorizedException("Invalid login session");
        }
        let signature = undefined;
        switch (tokenType) {
            case security_enum_1.TokenTypeEnum.ACCESS:
                signature = audience === security_enum_1.AudienceEnum.SYSTEM ? config_1.System_JWT_SECRET : config_1.User_JWT_SECRET;
                break;
            case security_enum_1.TokenTypeEnum.REFRESH:
                signature = audience === security_enum_1.AudienceEnum.SYSTEM ? config_1.System_REFRESH_JWT_SECRET : config_1.User_REFRESH_JWT_SECRET;
                break;
        }
        const verifyData = await this.verifyToken({ token, secretKey: signature });
        if (!verifyData.sub) {
            throw new exceptions_1.BadRequestException("Invalid token payload, sub is missing");
        }
        const user = await this.userRepository.findById({
            _id: new mongoose_1.Types.ObjectId(verifyData.sub),
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("No registered account found");
        }
        if (user.changeCredentialsTime && decoded.iat &&
            user.changeCredentialsTime?.getTime() > decoded.iat * 1000) {
            throw new exceptions_1.unauthorizedException("Invalid login session");
        }
        return { user, decoded };
    }
    async createRevokeToken({ sub, jti, ttl }) {
        await this.redis.set({
            key: this.redis.revokeTokenKey({ userId: sub, jti }),
            value: jti,
            ttl
        });
    }
}
exports.TokenService = TokenService;
exports.tokenService = new TokenService();
