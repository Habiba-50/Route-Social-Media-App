"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gqlAuthorization = exports.authorization = void 0;
const exceptions_1 = require("../common/exceptions");
const authorization = (accessRoles) => {
    return async (req, res, next) => {
        if (!req.user || !accessRoles.includes(req.user.role)) {
            throw new exceptions_1.ForbiddenException("Unauthorized account");
        }
        next();
    };
};
exports.authorization = authorization;
const gqlAuthorization = async (accessRoles, user) => {
    if (!user || !accessRoles.includes(user.role)) {
        throw (0, exceptions_1.MapGraphQLError)(new exceptions_1.ForbiddenException("Unauthorized account"));
    }
    return Promise.resolve(true);
};
exports.gqlAuthorization = gqlAuthorization;
