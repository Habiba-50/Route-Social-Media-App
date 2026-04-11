import type { NextFunction, Response, Request } from "express";
import { Router } from "express";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import { successResponse } from "../../common/response";
import userService from "./user.service";
import { userAuthorization } from "./user.authorization";
import { TokenTypeEnum } from "../../common/enums";


const router = Router();

// -------------------------------- Get Profile----------------------------------------------

router.get("/",
    authentication(),
    authorization(userAuthorization.profile),
    async (req: Request, res: Response , next : NextFunction) => {
        const data = await userService.profile(req.user)
        return successResponse({ res, statusCode: 200, data })
    }
)


// --------------------------------Rotate Token----------------------------------------------

router.post(
    "/rotate-token",
    authentication(TokenTypeEnum.REFRESH),
    async (req:Request, res:Response , next:NextFunction) => {
        const data = await userService.rotateToken(
            req.user,
            req.decoded,
            `${req.protocol}://${req.host}`,
        );
        return successResponse({ res, statusCode: 200, data });
    },
);


// ----------------------------------Logout---------------------------------------

router.post("/logout", authentication(), async (req:Request, res:Response , next:NextFunction) => {
    const status = await userService.logout(req.body.flag, req.user, req.decoded);
    return successResponse({ res, statusCode: status, data: { message: "Logged out successfully" } });
});



export default router;