"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postAuthorization = void 0;
const enums_1 = require("../../common/enums");
exports.postAuthorization = {
    createPost: [enums_1.RoleEnum.USER, enums_1.RoleEnum.ADMIN],
    updatePost: [enums_1.RoleEnum.USER, enums_1.RoleEnum.ADMIN],
    deletePost: [enums_1.RoleEnum.USER, enums_1.RoleEnum.ADMIN],
    getPost: [enums_1.RoleEnum.USER, enums_1.RoleEnum.ADMIN]
};
