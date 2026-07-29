"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeGateway = exports.RealtimeGatway = void 0;
const socket_io_1 = require("socket.io");
const services_1 = require("../../common/services");
const realtime_1 = require("../chat/realtime");
class RealtimeGatway {
    io;
    tokenService;
    redisService;
    constructor() {
        this.redisService = services_1.redisService;
        this.tokenService = new services_1.TokenService();
    }
    authentication = (async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.auth?.authorization ||
                socket.handshake.headers?.authorization;
            const { user, decoded } = await this.tokenService.decodeToken(token);
            socket.data = { user, decoded };
            await this.redisService.addSocket(user._id, socket.id);
            next();
        }
        catch (error) {
            console.log(error);
            next(error);
        }
    });
    initializeIO = (httpServer) => {
        this.io = new socket_io_1.Server(httpServer, {
            cors: { origin: "*" }
        });
        this.io.of("/").use(this.authentication);
        this.io.on("connection", async (socket) => {
            console.log(`User Connected 👌`);
            realtime_1.chatGateway.registerEvents(socket, this.io);
            const connections = await this.redisService.getSockets(socket.data.user._id.toString());
            console.log(`Connections are : ${connections.length}`);
            socket.on("disconnect", async () => {
                console.log(`User Disconnected 😥`);
                await this.redisService.removeSocket(socket.data.user._id.toString(), socket.id);
                const connections = await this.redisService.getSockets(socket.data.user._id.toString());
                console.log(`Connections are : ${connections.length}`);
                if (connections.length < 1) {
                    this.io.emit("user_offline", { user: socket.data.user._id });
                }
            });
        });
    };
    getIo() {
        return this.io;
    }
}
exports.RealtimeGatway = RealtimeGatway;
exports.realtimeGateway = new RealtimeGatway();
