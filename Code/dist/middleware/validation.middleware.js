"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePostUpdate = exports.validation = void 0;
const exceptions_1 = require("../common/exceptions");
const validation = (schema) => {
    return (req, res, next) => {
        const issues = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            if (key === 'body' && req.file) {
                req.body.file = req.file;
            }
            const reqValue = key === 'files' ? req.files : req[key];
            const validationResult = schema[key].safeParse(reqValue);
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
const normalizePostUpdate = (req, res, next) => {
    if (req.body.removeFiles &&
        typeof req.body.removeFiles === "string") {
        try {
            req.body.removeFiles = JSON.parse(req.body.removeFiles);
        }
        catch {
            req.body.removeFiles = [
                req.body.removeFiles
            ];
        }
    }
    console.log(req.body.removeFiles);
    next();
};
exports.normalizePostUpdate = normalizePostUpdate;
