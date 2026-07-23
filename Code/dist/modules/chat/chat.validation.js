"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sayHi = void 0;
const zod_1 = require("zod");
exports.sayHi = zod_1.z.strictObject({
    name: zod_1.z.string().min(2)
});
