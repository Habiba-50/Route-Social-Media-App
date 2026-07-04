"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
class NotificationService {
    client;
    constructor() {
        const serviceAccount = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)("./src/config/c45-route-74549-firebase-adminsdk-fbsvc-1e9726bc95.json")).toString());
        this.client = firebase_admin_1.default.apps.length
            ? firebase_admin_1.default.app()
            : firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(serviceAccount)
            });
    }
    async sendNotification({ token, title, body }) {
        await this.client.messaging().send({
            token: token,
            notification: {
                title: title,
                body: body
            }
        });
    }
    async sendNotifications({ tokens, title, body }) {
        await Promise.allSettled(tokens.map((token) => this.sendNotification({ token, title, body })));
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
