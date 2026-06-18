"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const index_1 = require("../model/index");
const base_repository_1 = require("./base.repository");
class NotificationRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(index_1.NotificationModel);
    }
}
exports.NotificationRepository = NotificationRepository;
