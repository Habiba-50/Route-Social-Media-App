"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutEnum = exports.TokenTypeEnum = exports.AudienceEnum = void 0;
var AudienceEnum;
(function (AudienceEnum) {
    AudienceEnum["USER"] = "user";
    AudienceEnum["SYSTEM"] = "system";
})(AudienceEnum || (exports.AudienceEnum = AudienceEnum = {}));
var TokenTypeEnum;
(function (TokenTypeEnum) {
    TokenTypeEnum["ACCESS"] = "access";
    TokenTypeEnum["REFRESH"] = "refresh";
})(TokenTypeEnum || (exports.TokenTypeEnum = TokenTypeEnum = {}));
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum["ALL"] = "all";
    LogoutEnum["ONE"] = "one";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
