"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const globalErrorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
        message: err.message || "Internal Server Error",
        cause: err.cause,
        stack: err.stack,
        error: err,
    });
};
exports.globalErrorHandler = globalErrorHandler;
