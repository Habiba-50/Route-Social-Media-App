import { z } from "zod";

export const sayHi = z.strictObject({
    name: z.string().min(2)
})

export const sendMessage = z.strictObject({
    sendTo: z.string(),
    content: z.string()
})

export const sendGroupMessage = z.strictObject({
    groupId: z.string(),
    content: z.string()
})