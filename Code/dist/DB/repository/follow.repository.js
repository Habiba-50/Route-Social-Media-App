"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowRepository = void 0;
const follow_model_1 = require("../model/follow.model");
const base_repository_1 = require("./base.repository");
class FollowRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(follow_model_1.Follow);
    }
}
exports.FollowRepository = FollowRepository;
