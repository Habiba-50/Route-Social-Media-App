import {z} from 'zod';
import { createPost, reactPost, updatePost } from './post.validation';

export type CreatePostDto = z.infer<typeof createPost.body>

export type UpdatePostBodyDto = z.infer<typeof updatePost.body>
export type UpdatePostParamsDto = z.infer<typeof updatePost.params>

export type ReactPostQueryDto = z.infer<typeof reactPost.query>
export type ReactPostParamsDto = z.infer<typeof reactPost.params>