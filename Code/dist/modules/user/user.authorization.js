"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuthorization = void 0;
const enums_1 = require("../../common/enums");
exports.userAuthorization = {
    profile: [enums_1.RoleEnum.USER, enums_1.RoleEnum.ADMIN],
    getAllUsers: [enums_1.RoleEnum.ADMIN]
};
