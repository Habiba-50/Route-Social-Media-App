import { model, models, Schema } from "mongoose";
import { IUser } from "../../common/interfaces";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";


const userSchema = new Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function (this: IUser) {
            return this.provider == ProviderEnum.SYSTEM;
         }
    },

    phone: { type: String , required:true},
    profilePicture: { type: String },
    profileCoveredPictures: { type: [String] },

    gender: { type: Number, enum: GenderEnum, default: GenderEnum.MALE },
    role: { type: Number, enum: RoleEnum, default: RoleEnum.USER },
    provider: { type: Number, enum: ProviderEnum, default: ProviderEnum.GOOGLE },

    changeCredentialsTime: { type: Date },
    DOB: { type: Date },
    confirmEmail: { type: Date },


}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_USERS'
})


userSchema.virtual('username').set(function (value: string) {
    const [firstName, lastName] = value.split(" ")
    this.firstName = firstName as string
    this.lastName = lastName as string
}).get(function (this: IUser) {
    return `${this.firstName} ${this.lastName}`
})


export const UserModel = models.User || model<IUser>('User', userSchema)