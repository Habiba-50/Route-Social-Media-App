import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authentication, authorization } from "../../middleware";
import { postAuthorization } from "./post.authorization";
import postService from "./post.service";
import { successResponse } from "../../common/response";
import { Types } from "mongoose";



const router = Router();

// Create Post
router.post('/',
    authentication(),
    authorization(postAuthorization.createPost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.createPost(req.body , req.user);
        return successResponse({ res, statusCode: 201, data });
    }
)

// Update Post
router.patch('/:id',
    authentication(),
    authorization(postAuthorization.updatePost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.updatePost(req.params.id as unknown as Types.ObjectId, req.body , req.user);
        return successResponse({ res, statusCode: 200, data });
    }
)

// Delete Post
router.delete('/:id',
    authentication(),
    authorization(postAuthorization.deletePost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.deletePost(req.params.id as unknown as Types.ObjectId);
        return successResponse({ res, statusCode: 200, data });
    }
)

// Get Post
router.get('/:id',
    authentication(),
    authorization(postAuthorization.getPost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.getPost(req.params.id as unknown as Types.ObjectId);
        return successResponse({ res, statusCode: 200, data });
    }
)


export default router;