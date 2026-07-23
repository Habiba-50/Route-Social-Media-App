"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const graphql_1 = require("graphql");
const user_1 = require("../user");
const post_schema_gql_1 = require("../post/gql/post.schema.gql");
const query = new graphql_1.GraphQLObjectType({
    name: "Query",
    description: "Root query",
    fields: {
        ...user_1.userGQLSchema.registerQuery(),
        ...post_schema_gql_1.postGQLSchema.registerQuery()
    }
});
const mutation = new graphql_1.GraphQLObjectType({
    name: "Mutation",
    description: "Root mutation",
    fields: {
        ...user_1.userGQLSchema.registerMutation(),
        ...post_schema_gql_1.postGQLSchema.registerMutation()
    }
});
exports.schema = new graphql_1.GraphQLSchema({ query, mutation });
