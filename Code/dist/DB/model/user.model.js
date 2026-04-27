"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const utils_1 = require("../../common/utils");
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function () {
            return this.provider == enums_1.ProviderEnum.SYSTEM;
        }
    },
    phone: { type: String, required: true },
    profilePicture: { type: String },
    profileCoveredPictures: { type: [String] },
    gender: { type: Number, enum: enums_1.GenderEnum, default: enums_1.GenderEnum.MALE },
    role: { type: Number, enum: enums_1.RoleEnum, default: enums_1.RoleEnum.USER },
    provider: { type: Number, enum: enums_1.ProviderEnum, default: enums_1.ProviderEnum.GOOGLE },
    changeCredentialsTime: { type: Date },
    DOB: { type: Date },
    confirmEmail: { type: Date },
    deletedAt: { type: Date },
    restoredAt: { type: Date },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_USERS'
});
userSchema.virtual('username').set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.firstName = firstName;
    this.lastName = lastName;
}).get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await (0, utils_1.generateHash)({ plaintext: this.password });
    }
    if (this.isModified("phone")) {
        this.phone = await (0, utils_1.encrypt)(this.phone);
    }
});
userSchema.post("save", async function () {
    console.log(this);
});
userSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    if (query.force === true) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }
});
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)('User', userSchema);
