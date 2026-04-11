"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../../../config/config");
const exceptions_1 = require("../../exceptions");
const ENCRYPTION_SECRET_KEY = Buffer.from(config_1.ENCRYPTION_KEY);
const encrypt = (text) => {
    const iv = crypto_1.default.randomBytes(config_1.IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', ENCRYPTION_SECRET_KEY, iv);
    let encryptedData = cipher.update(text, 'utf-8', 'hex');
    encryptedData += cipher.final('hex');
    return `${iv.toString('hex')}:${encryptedData}`;
};
exports.encrypt = encrypt;
const decrypt = (encryptedData) => {
    const [iv, encryptedText] = encryptedData.split(":") || [];
    if (!iv || !encryptedText) {
        throw new exceptions_1.BadRequestException("Fail to encrypt");
    }
    const binaryLikeIv = Buffer.from(iv, 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', ENCRYPTION_SECRET_KEY, binaryLikeIv);
    let decryptedData = decipher.update(encryptedText.trim(), 'hex', 'utf8');
    decryptedData += decipher.final('utf-8');
    return decryptedData;
};
exports.decrypt = decrypt;
