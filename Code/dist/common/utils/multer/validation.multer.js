"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileFilter = exports.fileFieldValidation = void 0;
const exceptions_1 = require("../../exceptions");
exports.fileFieldValidation = {
    image: ["image/jpeg", "image/png", "image/jpg"],
    video: ["video/mp4"],
};
const fileFilter = (validation = []) => {
    return function (req, file, cb) {
        if (validation.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new exceptions_1.BadRequestException("Invalid file formate"));
        }
    };
};
exports.fileFilter = fileFilter;
