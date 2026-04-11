"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNumberOtp = void 0;
const createNumberOtp = async () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000).toString();
};
exports.createNumberOtp = createNumberOtp;
