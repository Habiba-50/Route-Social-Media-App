"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = exports.commentRouter = void 0;
var comment_controller_1 = require("./comment.controller");
Object.defineProperty(exports, "commentRouter", { enumerable: true, get: function () { return __importDefault(comment_controller_1).default; } });
var comment_service_1 = require("./comment.service");
Object.defineProperty(exports, "commentService", { enumerable: true, get: function () { return comment_service_1.commentService; } });
