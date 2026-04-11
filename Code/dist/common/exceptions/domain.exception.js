"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenException = exports.unauthorizedException = exports.NotFoundException = exports.conflictException = exports.BadRequestException = void 0;
const application_exception_1 = require("./application.exception");
class BadRequestException extends application_exception_1.ApplicationException {
    constructor(message = "BadRequest", cause) {
        super(message, 400, cause);
    }
}
exports.BadRequestException = BadRequestException;
class conflictException extends application_exception_1.ApplicationException {
    constructor(message = "Conflict", cause) {
        super(message, 409, cause);
    }
}
exports.conflictException = conflictException;
class NotFoundException extends application_exception_1.ApplicationException {
    constructor(message = "Not Found", cause) {
        super(message, 404, cause);
    }
}
exports.NotFoundException = NotFoundException;
class unauthorizedException extends application_exception_1.ApplicationException {
    constructor(message = "Unauthorized", cause) {
        super(message, 401, cause);
    }
}
exports.unauthorizedException = unauthorizedException;
class ForbiddenException extends application_exception_1.ApplicationException {
    constructor(message = "Forbidden", cause) {
        super(message, 403, cause);
    }
}
exports.ForbiddenException = ForbiddenException;
