"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResolver = exports.UserResolver = void 0;
const middleware_1 = require("../../../middleware");
const user_authorization_1 = require("../user.authorization");
const user_service_1 = __importDefault(require("../user.service"));
const user_validation_1 = require("../user.validation");
class UserResolver {
    userService;
    constructor() {
        this.userService = user_service_1.default;
    }
    profile = async (parent, args, { user }, info) => {
        await (0, middleware_1.gqlAuthorization)(user_authorization_1.userAuthorization.profile, user);
        await (0, middleware_1.GQLValidation)(user_validation_1.profileGQL, args);
        const userProfile = await this.userService.profile(user);
        return { data: userProfile };
    };
}
exports.UserResolver = UserResolver;
exports.userResolver = new UserResolver();
