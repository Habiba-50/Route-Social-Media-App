"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create({ data, options, }) {
        const result = await this.model.create(data, options);
        return result;
    }
    async findOne({ filter = {}, projection, options, }) {
        let doc = this.model.findOne(filter, projection, options);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async findById({ _id, projection, options, }) {
        let doc = this.model.findById(_id, projection);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async findOneAndUpdate({ filter = {}, update, options, }) {
        return await this.model.findOneAndUpdate(filter, update, options);
    }
    async findOneAndDelete({ filter = {}, options, }) {
        return await this.model.findOneAndDelete(filter, options);
    }
    async findByIdAndDelete({ _id, options, }) {
        const result = await this.model.findByIdAndDelete(_id, options);
        return result;
    }
    async updateOne({ filter = {}, update, options, }) {
        return await this.model.updateOne(filter, update, options);
    }
    async updateMany({ filter = {}, update, options, }) {
        return await this.model.updateMany(filter, update, options);
    }
    async updateById({ _id, update, options, }) {
        return await this.model.updateOne({ _id }, update, options);
    }
    async findByIdAndUpdate({ _id, update, options, }) {
        const result = await this.model.findByIdAndUpdate(_id, update, options);
        return result;
    }
    async deleteOne({ filter = {}, }) {
        return await this.model.deleteOne(filter);
    }
    async deleteMany({ filter = {}, }) {
        return await this.model.deleteMany(filter);
    }
    async deleteById({ _id }) {
        return await this.model.deleteOne({ _id });
    }
}
exports.DatabaseRepository = DatabaseRepository;
