"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactOnPost = exports.postList = exports.OnePostType = void 0;
const graphql_1 = require("graphql");
const enums_1 = require("../../../common/enums");
const user_types_gql_1 = require("../../user/gql/user.types.gql");
const AvailabilityEnumType = new graphql_1.GraphQLEnumType({
    name: "AvailabilityEnum",
    values: {
        PUBLIC: { value: enums_1.AvailabilityEnum.PUBLIC },
        FRIENDS: { value: enums_1.AvailabilityEnum.FRIENDS },
        ONLY_ME: { value: enums_1.AvailabilityEnum.ONLY_ME },
    },
});
exports.OnePostType = new graphql_1.GraphQLObjectType({
    name: "OnePostType",
    fields: () => ({
        _id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
        folderId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        content: { type: graphql_1.GraphQLString },
        files: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        likes: {
            type: new graphql_1.GraphQLList(user_types_gql_1.OneUserType),
            resolve: (post) => (post.likes || []).map((like) => like.userId).filter(Boolean)
        },
        tags: { type: new graphql_1.GraphQLList(user_types_gql_1.OneUserType) },
        availability: { type: AvailabilityEnumType },
        createdBy: { type: new graphql_1.GraphQLNonNull(user_types_gql_1.OneUserType) },
        updatedBy: { type: new graphql_1.GraphQLNonNull(user_types_gql_1.OneUserType) },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: graphql_1.GraphQLString },
        deletedAt: { type: graphql_1.GraphQLString },
        restoredAt: { type: graphql_1.GraphQLString },
    }),
});
exports.postList = new graphql_1.GraphQLNonNull(new graphql_1.GraphQLObjectType({
    name: "PostListResponse",
    fields: {
        data: {
            type: new graphql_1.GraphQLObjectType({
                name: "PostPaginationResponse",
                fields: {
                    docs: { type: new graphql_1.GraphQLList(exports.OnePostType) },
                    currentPage: { type: graphql_1.GraphQLInt },
                    pageSize: { type: graphql_1.GraphQLInt },
                    pages: { type: graphql_1.GraphQLInt },
                },
            }),
        },
    },
}));
exports.ReactOnPost = new graphql_1.GraphQLObjectType({
    name: "ReactOnPostResponse",
    fields: {
        message: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        data: { type: exports.OnePostType }
    }
});
