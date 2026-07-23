import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authentication } from "../../middleware";
import { successResponse } from "../../common/response";
import { chatService } from "./chat.service";


const router = Router({ mergeParams: true });

// -------------------------------- Get User Chat----------------------------------------------
router.get(
    "/",
    authentication(),
    async (req:Request , res:Response , next:NextFunction) => {
        const data = await chatService.getChat(req.params.userId as string , req.user)
        return successResponse({res , statusCode:200 , data})
    }
)

export default router;