"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profile = exports.OneUserType = exports.GenderGQLEnumType = void 0;
const graphql_1 = require("graphql");
const enums_1 = require("../../../common/enums");
exports.GenderGQLEnumType = new graphql_1.GraphQLEnumType({
    name: "GenderGQLEnumType",
    values: {
        Male: { value: enums_1.GenderEnum.MALE },
        Female: { value: enums_1.GenderEnum.FEMALE },
    }
});
const RoleGQLEnumType = new graphql_1.GraphQLEnumType({
    name: "RoleType",
    values: {
        ADMIN: { value: enums_1.RoleEnum.ADMIN },
        USER: { value: enums_1.RoleEnum.USER },
    }
});
const ProviderGQLEnumType = new graphql_1.GraphQLEnumType({
    name: "ProviderType",
    values: {
        SYSTEM: { value: enums_1.ProviderEnum.SYSTEM },
        GOOGLE: { value: enums_1.ProviderEnum.GOOGLE },
    }
});
exports.OneUserType = new graphql_1.GraphQLObjectType({
    name: "OneUserType",
    fields: () => ({
        _id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
        firstName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        lastName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        username: { type: graphql_1.GraphQLString },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        password: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        friends: { type: new graphql_1.GraphQLList(exports.OneUserType) },
        phone: { type: graphql_1.GraphQLString },
        profilePicture: { type: graphql_1.GraphQLString },
        profileCoveredPictures: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        gender: { type: exports.GenderGQLEnumType },
        role: { type: RoleGQLEnumType },
        provider: { type: ProviderGQLEnumType },
        changeCredentialsTime: { type: graphql_1.GraphQLString },
        DOB: { type: graphql_1.GraphQLString },
        confirmEmail: { type: graphql_1.GraphQLString },
        createdAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
        deletedAt: { type: graphql_1.GraphQLString },
        restoredAt: { type: graphql_1.GraphQLString },
    })
});
exports.profile = new graphql_1.GraphQLNonNull(new graphql_1.GraphQLObjectType({
    name: "ProfileResponse",
    description: "",
    fields: {
        data: { type: exports.OneUserType }
    }
}));
