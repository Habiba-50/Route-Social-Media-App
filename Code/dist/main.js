"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_bootstrap_1 = __importDefault(require("./app.bootstrap"));
const node_path_1 = require("node:path");
console.log((0, node_path_1.resolve)());
(0, app_bootstrap_1.default)();
