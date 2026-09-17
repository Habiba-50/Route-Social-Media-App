"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepostRepository = void 0;
const model_1 = require("../model");
const base_repository_1 = require("./base.repository");
class RepostRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(model_1.RepostModel);
    }
}
exports.RepostRepository = RepostRepository;
