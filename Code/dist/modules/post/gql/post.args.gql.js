"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactOnPost = exports.postList = exports.ReactGQLEnumType = void 0;
const graphql_1 = require("graphql");
const enums_1 = require("../../../common/enums");
exports.ReactGQLEnumType = new graphql_1.GraphQLEnumType({
    name: "ReactGQLEnumType",
    values: {
        DISLIKE: { value: enums_1.ReactEnum.DISLIKE },
        LIKE: { value: enums_1.ReactEnum.LIKE },
        LOVE: { value: enums_1.ReactEnum.LOVE },
        LAUGH: { value: enums_1.ReactEnum.LAUGH },
        WOW: { value: enums_1.ReactEnum.WOW },
        SAD: { value: enums_1.ReactEnum.SAD },
        ANGRY: { value: enums_1.ReactEnum.ANGRY },
    }
});
exports.postList = {
    page: { type: graphql_1.GraphQLInt },
    size: { type: graphql_1.GraphQLInt },
    search: { type: graphql_1.GraphQLString }
};
exports.reactOnPost = {
    postId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
    react: {
        type: exports.ReactGQLEnumType
    },
};
