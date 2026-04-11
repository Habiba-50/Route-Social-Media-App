"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const config_1 = require("../config/config");
exports.redisClient = (0, redis_1.createClient)({
    url: config_1.REDIS_URL,
    socket: {
        tls: true,
        rejectUnauthorized: false,
    },
});
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
        console.log("Redis_DB connected successfully 👌🌸");
    }
    catch (error) {
        console.error("Error connecting to Redis:", error);
    }
};
exports.connectRedis = connectRedis;
