"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const utils_1 = require("../../common/utils");
const config_1 = require("../../config/config");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const enums_1 = require("../../common/enums");
class UserService {
    tokenService;
    redisService;
    constructor() {
        this.tokenService = new services_1.TokenService();
        this.redisService = new services_1.RedisService();
    }
    async profile(user) {
        if (user?.phone) {
            user.phone = await (0, utils_1.decrypt)(user.phone);
        }
        return user;
    }
    async rotateToken(user, { sub, jti, iat }, issuer) {
        if ((iat + config_1.ACCESS_TOKEN_EXPIRY) * 1000 > Date.now() + (5 * 60 * 1000)) {
            const remainingTime = (iat + config_1.ACCESS_TOKEN_EXPIRY) * 1000 - Date.now();
            throw new exceptions_1.conflictException(`Current access token is still valid, remaining time : ${Math.floor(remainingTime / 60000)} minute`);
        }
        await this.tokenService.createRevokeToken({
            sub: sub,
            jti: jti,
            ttl: iat + config_1.REFRESH_TOKEN_EXPIRY
        });
        const { access_token, refresh_token } = await this.tokenService.createLoginCredentials({ user, issuer });
        return { access_token, refresh_token };
    }
    ;
    async logout(flag, user, { jti, iat, sub }) {
        let status = 200;
        switch (flag) {
            case enums_1.LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                const result = await this.redisService.deleteKey(await this.redisService.keys(this.redisService.baseRevokeTokenKey(sub)));
                console.log("Logout all sessions result:", result);
                break;
            default:
                await this.tokenService.createRevokeToken({
                    sub: sub,
                    jti: jti,
                    ttl: iat + config_1.REFRESH_TOKEN_EXPIRY,
                });
                status = 201;
                break;
        }
        return status;
    }
}
exports.UserService = UserService;
exports.default = new UserService();
