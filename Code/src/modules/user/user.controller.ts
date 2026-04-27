import type { NextFunction, Response, Request } from "express";
import { Router } from "express";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import { successResponse } from "../../common/response";
import userService from "./user.service";
import { userAuthorization } from "./user.authorization";
import {  StorageApproachEnum, TokenTypeEnum } from "../../common/enums";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import { IUser } from "../../common/interfaces";



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


// ---------------------------------- Profile Image---------------------------------------
// router.patch("/profile-image", 
//     authentication(),
//     cloudFileUpload({
//         validation: fileFieldValidation.image,
//         storageApproach: StorageApproachEnum.DISK,
//     }).single("attachment"),
//     async (req: Request, res: Response, next: NextFunction) => {
//         const data = await userService.profileImage(req.user , req.file as Express.Multer.File)
//         return successResponse({res , data })
//     }
// )

// Pre-signed URL for profile image
router.patch("/profile-image",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        console.log("body",req.body)
        const data = await userService.profileImagePresignedUrl(req.user, req.body)
        return successResponse({res , data })
    }
)

// ---------------------------------- Cover Images---------------------------------------
router.patch("/cover-images", 
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image,
        storageApproach: StorageApproachEnum.DISK,
    }).array("attachments",2),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.profileCoverImages(req.user , req.files as Express.Multer.File[])
        return successResponse({res , data })
    }
)

// ---------------------------------- Delete User---------------------------------------
router.delete("/delete/:userId",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.deleteUser(req.params.userId as string)
        return successResponse({res , statusCode:200 , message:"User deleted successfully" , data})
    }
)

// ---------------------------------- Restore User---------------------------------------
router.patch("/restore/:userId",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.restoreUser(req.params.userId as string)
        return successResponse({res , statusCode:200 , message:"User restored successfully" ,data})
    }
)

// ---------------------------------- Get All Users---------------------------------------
router.get("/all",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.getAllUsers()
        return successResponse({res , statusCode:200 , data})
    }
)

// ---------------------------------- Get All Deleted Users---------------------------------------
router.get("/deleted",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.getAllDeletedUsers()
        return successResponse({res , statusCode:200 , data})
    }
)

// ---------------------------------- Get All Active Users---------------------------------------
router.get("/active",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.getAllActiveUsers()
        return successResponse({res , statusCode:200 , data})
    }
)

// ---------------------------------- Update Profile---------------------------------------
router.patch("/update",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.updateProfile(req.user , req.body as Partial<IUser>)
        return successResponse({res , statusCode:200 , data})
    }
)

// ---------------------------------- Force Delete User---------------------------------------
router.delete("/destroy/:userId",
    authentication(),
    authorization(userAuthorization.getAllUsers),
    async (req: Request, res: Response, next: NextFunction) => {
        await userService.hardDeleteUser(req.params.userId as string, req.body.force as string )
        return successResponse({res , statusCode:200 , message:"User deleted successfully"})
    }
)


export default router;