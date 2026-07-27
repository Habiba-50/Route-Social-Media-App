"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatEvent = exports.ChatEvent = void 0;
const middleware_1 = require("../../../middleware");
const validators = __importStar(require("../chat.validation"));
const chat_service_1 = require("../chat.service");
const services_1 = require("../../../common/services");
class ChatEvent {
    chatService;
    redisService;
    constructor() {
        this.chatService = chat_service_1.chatService;
        this.redisService = services_1.redisService;
    }
    sayHi = async (socket) => {
        try {
            return socket.on("sayHi", async (data) => {
                await (0, middleware_1.SocketValidation)(validators.sayHi, data);
                console.log({ data });
                socket.emit("sayHi", "Hello World from server");
            });
        }
        catch (error) {
            return socket.emit("custom_error", error);
        }
    };
    sendMessage = async (socket, io) => {
        return socket.on("sendMessage", async ({ sendTo, content }) => {
            try {
                console.log(sendTo, content);
                await (0, middleware_1.SocketValidation)(validators.sendMessage, { sendTo, content });
                await this.chatService.sendMessage({ sendTo, content }, socket.data.user);
                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString());
                io.to(socketIds).emit("successMessage", { content, sendTo });
                const receiverSocketIds = await this.redisService.getSockets(sendTo);
                if (receiverSocketIds.length) {
                    socket.to(receiverSocketIds).emit("newMessage", { content, sendTo, from: socket.data.user });
                }
            }
            catch (error) {
                return socket.emit("custom_error", error);
            }
        });
    };
    sendGroupMessage = async (socket, io) => {
        return socket.on("sendGroupMessage", async ({ groupId, content }) => {
            try {
                console.log(groupId, content);
                await (0, middleware_1.SocketValidation)(validators.sendGroupMessage, { groupId, content });
                await this.chatService.sendGroupMessage({ groupId, content }, socket.data.user);
                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString());
                io.to(socketIds).emit("successMessage", { content, sendTo: groupId });
            }
            catch (error) {
                return socket.emit("custom_error", error);
            }
        });
    };
}
exports.ChatEvent = ChatEvent;
exports.chatEvent = new ChatEvent();
