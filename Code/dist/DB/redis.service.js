"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.increment = exports.mGet = exports.deleteKey = exports.keys = exports.exists = exports.expire = exports.ttl = exports.get = exports.update = exports.set = exports.otp2sv = exports.bannedAccountKey = exports.maxLoginTrialsKey = exports.blockOtpKey = exports.maxRequestOtpKey = exports.otpKey = exports.revokeTokenKey = exports.baseRevokeTokenKey = void 0;
const baseRevokeTokenKey = (userId) => {
    return `revoked_tokens::${userId.toString()}`;
};
exports.baseRevokeTokenKey = baseRevokeTokenKey;
const revokeTokenKey = ({ userId, jti }) => {
    return `${(0, exports.baseRevokeTokenKey)({ userId })}::${jti}`;
};
exports.revokeTokenKey = revokeTokenKey;
const otpKey = ({ email, type = EmailEnum.ConfirmEmail }) => {
    return `OTP::User::${email}::${type}`;
};
exports.otpKey = otpKey;
const maxRequestOtpKey = ({ email, type = EmailEnum.ConfirmEmail }) => {
    return `${(0, exports.otpKey)({ email, type })}::MaxTrial`;
};
exports.maxRequestOtpKey = maxRequestOtpKey;
const blockOtpKey = ({ email, type = EmailEnum.ConfirmEmail }) => {
    return `${(0, exports.otpKey)({ email, type })}::Block`;
};
exports.blockOtpKey = blockOtpKey;
const maxLoginTrialsKey = (email) => {
    return `LoginTrials::${email}`;
};
exports.maxLoginTrialsKey = maxLoginTrialsKey;
const bannedAccountKey = (email) => {
    return `BannedAccount::${email}`;
};
exports.bannedAccountKey = bannedAccountKey;
const otp2sv = (email) => {
    return `otp:2sv:${email}`;
};
exports.otp2sv = otp2sv;
const set = async ({ key, value, ttl } = {}) => {
    try {
        let data = typeof value === "string" ? JSON.stringify(value) : value;
        return ttl
            ? await redisClient.set(key, data, { EX: ttl })
            : await redisClient.set(key, data);
        console.log(`Key-value pair set successfully: ${key} = ${data}`);
    }
    catch (error) {
        console.error("Fail in redis set operation", error);
    }
};
exports.set = set;
const update = async ({ key, value, ttl } = {}) => {
    try {
        if (!(await redisClient.exists(key))) {
            return 0;
        }
        return await (0, exports.set)({ key, value, ttl });
    }
    catch (error) {
        console.error("Fail in redis update operation", error);
    }
};
exports.update = update;
const get = async (key) => {
    try {
        const data = await redisClient.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return data;
        }
    }
    catch (error) {
        console.error("Redis GET error:", error);
        return null;
    }
};
exports.get = get;
const ttl = async (key) => {
    try {
        return await redisClient.ttl(`${key}`);
    }
    catch (error) {
        console.error("Redis TTL error:", error);
        return null;
    }
};
exports.ttl = ttl;
const expire = async (key, ttl) => {
    try {
        return await redisClient.expire(key, ttl);
    }
    catch (error) {
        console.error("Redis expire error:", error);
        return null;
    }
};
exports.expire = expire;
const exists = async (key) => {
    try {
        return await redisClient.exists(key);
    }
    catch (error) {
        console.error("Redis expire error:", error);
        return null;
    }
};
exports.exists = exists;
const keys = async (prefix) => {
    try {
        return await redisClient.keys(`${prefix}*`);
    }
    catch (error) {
        console.error("Redis KEYS error:", error);
        return null;
    }
};
exports.keys = keys;
const deleteKey = async (keys) => {
    try {
        if (!keys.length)
            return 0;
        const result = await redisClient.del(keys);
        return result;
    }
    catch (error) {
        console.log(` Fail in redis dell operation ${error}`);
    }
};
exports.deleteKey = deleteKey;
const mGet = async (keys = []) => {
    try {
        if (!keys.length)
            return 0;
        return await redisClient.mGet(keys);
    }
    catch (error) {
        console.log(`Fail in redis mGet operation: ${error}`);
        throw error;
    }
};
exports.mGet = mGet;
const increment = async (key) => {
    try {
        if (!await redisClient.exists(key)) {
            return 0;
        }
        return await redisClient.incr(key);
    }
    catch (error) {
        console.log(`Fail to set this operation `);
    }
};
exports.increment = increment;
