"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const redis_service_1 = require("./redis.service");
class NotificationService {
    client;
    redis;
    constructor() {
        this.redis = redis_service_1.redisService;
        const serviceAccount = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)("./src/config/c45-route-74549-firebase-adminsdk-fbsvc-ca07563c99.json")).toString());
        this.client = firebase_admin_1.default.apps.length
            ? firebase_admin_1.default.app()
            : firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(serviceAccount)
            });
    }
    async sendNotification({ userId, token, title, body, entityId, entityType, senderId, type }) {
        try {
            return await this.client.messaging().send({
                token,
                notification: {
                    title,
                    body
                },
                data: {
                    entityId,
                    entityType,
                    senderId,
                    type
                }
            });
        }
        catch (error) {
            if (error.code === "messaging/registration-token-not-registered" ||
                error.code === "messaging/invalid-registration-token") {
                await this.redis.removeFCM(userId, token);
            }
            throw error;
        }
    }
    async sendNotifications({ userId, tokens, title, body, entityId, entityType, senderId, type }) {
        const response = await Promise.allSettled(tokens.map((token) => this.sendNotification({
            userId: userId,
            token,
            title,
            body,
            entityId,
            entityType,
            senderId,
            type
        })));
        for (let i = 0; i < response.length; i++) {
            const result = response[i];
            if (result?.status === "rejected") {
                const errorCode = result?.reason?.code;
                if (errorCode === "messaging/registration-token-not-registered" ||
                    errorCode === "messaging/invalid-registration-token") {
                    await this.redis.removeFCM(userId, tokens[i]);
                }
            }
        }
        return response;
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
