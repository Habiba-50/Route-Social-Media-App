"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authentication = void 0;
const enums_1 = require("../common/enums");
const services_1 = require("../common/services");
const authentication = (tokenType = enums_1.TokenTypeEnum.ACCESS) => {
    return async (req, res, next) => {
        const tokenService = new services_1.TokenService();
        const { user, decoded } = await tokenService.decodeToken(req.headers.authorization, [enums_1.TokenTypeEnum.ACCESS, enums_1.TokenTypeEnum.REFRESH]);
        req.user = user;
        req.decoded = decoded;
        next();
    };
};
exports.authentication = authentication;
