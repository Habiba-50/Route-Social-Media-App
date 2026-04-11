"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderEnum = exports.RoleEnum = exports.GenderEnum = void 0;
var GenderEnum;
(function (GenderEnum) {
    GenderEnum[GenderEnum["MALE"] = 0] = "MALE";
    GenderEnum[GenderEnum["FEMALE"] = 1] = "FEMALE";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum[RoleEnum["ADMIN"] = 0] = "ADMIN";
    RoleEnum[RoleEnum["USER"] = 1] = "USER";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum[ProviderEnum["SYSTEM"] = 0] = "SYSTEM";
    ProviderEnum[ProviderEnum["GOOGLE"] = 1] = "GOOGLE";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
