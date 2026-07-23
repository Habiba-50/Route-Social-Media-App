import z from "zod";


export const profileGQL = z.strictObject({
    search: z.string().min(2, "Search query must be at least 2 character long").optional(),
})