import z from "zod";
import { paginationValidationSchema } from "../../common/validation";


export const profileGQL = z.strictObject({
    search: z.string().min(2, "Search query must be at least 2 character long").optional(),
})


export const searchUserValidation = {
    query: paginationValidationSchema.query.extend({
        search: z.string().max(10, "Search query must be less than 100 character").optional(),
    })
};
