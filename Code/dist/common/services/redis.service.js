"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
class RedisService {
    client;
    constructor() {
        this.client = (0, redis_1.createClient)({ url: config_1.REDIS_URL });
        this.handelEvent();
    }
    handelEvent() {
        this.client.on("error", (error) => {
            console.error("Error connecting to Redis 🙃:", error);
        });
        this.client.on("ready", () => {
            console.log(`Redis is ready 💗`);
        });
    }
    async connent() {
        await this.client.connect();
        console.log("Redis_DB connected successfully 👌🌸");
    }
    otpKey({ email, subject = enums_1.EmailEnum.ConfirmEmail }) {
        return `OTP::User::${email}::${subject}`;
    }
    ;
    maxRequestOtpKey({ email, subject = enums_1.EmailEnum.ConfirmEmail }) {
        return `${this.otpKey({ email, subject })}::MaxTrial`;
    }
    blockOtpKey({ email, subject = enums_1.EmailEnum.ConfirmEmail }) {
        return `${this.otpKey({ email, subject })}::Block`;
    }
    baseRevokeTokenKey(userId) {
        return `revoked_tokens::${userId.toString()}`;
    }
    revokeTokenKey({ userId, jti }) {
        return `${this.baseRevokeTokenKey(userId)}::${jti}`;
    }
    async set({ key, value, ttl }) {
        try {
            value = typeof value === "string" ? JSON.stringify(value) : value;
            return ttl
                ? await this.client.set(key, value, { EX: ttl })
                : await this.client.set(key, value);
        }
        catch (error) {
            console.error("Fail in redis set operation", error);
            return null;
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error("Fail in redis get operation", error);
            return null;
        }
    }
    async deleteKey(keys) {
        try {
            if (keys.length === 0)
                return 0;
            return await this.client.del(keys);
        }
        catch (error) {
            console.error("Fail in redis delete operation", error);
            return 0;
        }
    }
    async exists(key) {
        try {
            const value = await this.client.exists(key);
            console.log(`Value exists successfully: ${key} = ${value}`);
            return true;
        }
        catch (error) {
            console.error("Fail in redis exists operation", error);
            return false;
        }
    }
    async increment(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            console.error("Fail in redis increment operation", error);
            return 0;
        }
    }
    async decrement(key) {
        try {
            const value = await this.client.decr(key);
            console.log(`Value decremented successfully: ${key} = ${value}`);
            return value;
        }
        catch (error) {
            console.error("Fail in redis decrement operation", error);
            return 0;
        }
    }
    async ttl(key) {
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            console.error("Fail in redis ttl operation", error);
            return -1;
        }
    }
    async keys(prefix) {
        try {
            return await this.client.keys(`${prefix}*`);
        }
        catch (error) {
            console.error("Fail in redis keys operation", error);
            return [];
        }
    }
    async expire(key, ttl) {
        try {
            return await this.client.expire(key, ttl);
        }
        catch (error) {
            console.error("Fail in redis expire operation", error);
            return false;
        }
    }
    async update(key, value, ttl) {
        try {
            if (!await this.exists(key))
                return false;
            return ttl
                ? await this.client.set(key, value, { EX: ttl })
                : await this.client.set(key, value);
        }
        catch (error) {
            console.error("Fail in redis update operation", error);
            return false;
        }
    }
    async mGet(keys) {
        try {
            return await this.client.mGet(keys);
        }
        catch (error) {
            console.error("Fail in redis mGet operation", error);
            return null;
        }
    }
}
exports.RedisService = RedisService;
exports.redisService = new RedisService();
