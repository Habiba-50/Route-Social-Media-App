"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequestRepository = void 0;
const model_1 = require("../model");
const base_repository_1 = require("./base.repository");
class FriendRequestRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(model_1.FriendRequest);
    }
}
exports.FriendRequestRepository = FriendRequestRepository;
