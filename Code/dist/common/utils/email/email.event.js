"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEmitter = void 0;
const node_events_1 = require("node:events");
exports.emailEmitter = new node_events_1.EventEmitter();
exports.emailEmitter.on("send-email", async (emailFunction) => {
    try {
        await emailFunction();
    }
    catch {
        console.log("Fail to send email");
    }
});
