import {z} from 'zod';
import { generalValidationFields } from '../../common/validation';
import { Types } from 'mongoose';


export const createPost = {
    body: z.strictObject({
        content: generalValidationFields.content,
    }).catchall(z.string())
}

export const updatePost = {
    body: z.strictObject({
        content: generalValidationFields.content,
    }).catchall(z.string()),
    params: z.strictObject({
        id: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "Invalid post ID" }),
    })
}

export const deletePost = {
    params: z.strictObject({
        id: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "Invalid post ID" }),
    })
}

export const getPost = {
    params: z.strictObject({
        id: generalValidationFields.id,
    })
}
