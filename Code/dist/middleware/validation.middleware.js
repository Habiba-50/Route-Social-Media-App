"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = void 0;
const exceptions_1 = require("../common/exceptions");
const validation = (schema) => {
    return (req, res, next) => {
        const issues = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const error = validationResult.error;
                console.log({ error });
                issues.push({
                    key,
                    issues: error.issues.map((issue) => ({
                        path: [key, ...issue.path],
                        message: issue.message,
                    }))
                });
            }
        }
        if (issues.length > 0) {
            throw new exceptions_1.BadRequestException("Validation failed", { error: issues });
        }
        next();
    };
};
exports.validation = validation;
