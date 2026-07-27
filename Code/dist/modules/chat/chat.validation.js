"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGroupMessage = exports.sendMessage = exports.sayHi = void 0;
const zod_1 = require("zod");
exports.sayHi = zod_1.z.strictObject({
    name: zod_1.z.string().min(2)
});
exports.sendMessage = zod_1.z.strictObject({
    sendTo: zod_1.z.string(),
    content: zod_1.z.string()
});
exports.sendGroupMessage = zod_1.z.strictObject({
    groupId: zod_1.z.string(),
    content: zod_1.z.string()
});
