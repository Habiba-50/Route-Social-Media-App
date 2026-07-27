"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const modules_1 = require("./modules");
const middleware_1 = require("./middleware");
const config_1 = require("./config/config");
const connection_db_1 = require("./DB/connection.db");
const services_1 = require("./common/services");
const node_stream_1 = require("node:stream");
const node_util_1 = require("node:util");
const response_1 = require("./common/response");
const express_2 = require("graphql-http/lib/use/express");
const cors_1 = __importDefault(require("cors"));
const chat_1 = require("./modules/chat");
const s3WriteStream = (0, node_util_1.promisify)(node_stream_1.pipeline);
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: '*',
        credentials: true
    }));
    app.get('/', (req, res, next) => {
        res.status(200).json({ message: "Landing page" });
    });
    app.use(express_1.default.json());
    app.all('/graphql', (0, middleware_1.authentication)(), (0, express_2.createHandler)({ schema: modules_1.schema, context: (req) => ({ user: req.raw.user, decoded: req.raw.decoded }) }));
    app.use("/auth", modules_1.authRouter);
    app.use("/user", modules_1.userRouter);
    app.use("/notification", modules_1.notificationRouter);
    app.use("/post", modules_1.postRouter);
    app.use("/chat", chat_1.chatRouter);
    app.get("/uploads/*path", async (req, res, next) => {
        const { download, filename } = req.query;
        const { path } = req.params;
        const key = path.join('/');
        const { Body, ContentType } = await services_1.s3Service.getAsset({ key });
        res.setHeader("Content-Type", ContentType || "application/octet-stream");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${filename || key.split("/").pop()}"`);
        }
        return await s3WriteStream(Body, res);
    });
    app.get("/pre-signed/*path", async (req, res, next) => {
        const { download, fileName } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const url = await services_1.s3Service.createPreSignedFetchLink({ Key, download, fileName });
        return (0, response_1.successResponse)({ res, data: { url } });
    });
    app.get("/*dummy", (req, res, next) => {
        res.status(404).json({ message: "Invalid application routing" });
    });
    app.use(middleware_1.globalErrorHandler);
    await (0, connection_db_1.connectDB)();
    await services_1.redisService.connent();
    const httpServer = app.listen(config_1.port, () => {
        console.log("Server is running on port 3000 🚀");
    });
    await modules_1.realtimeGateway.initializeIO(httpServer);
    console.log("Application bootstrapped successfully!");
};
exports.default = bootstrap;
