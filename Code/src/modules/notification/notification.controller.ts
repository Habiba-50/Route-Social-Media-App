import { Router, type NextFunction, type Request, type Response } from "express";
import { successResponse } from "../../common/response";
import { authentication } from "../../middleware";
import notificationService from "./notification.service";


const router = Router();


router.get("/", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const data = await notificationService.getAll(req.user?._id as unknown as string);
    return successResponse({ res, statusCode: 200, data });
})



export default router;