import type { NextFunction, Request, Response } from "express";
import { RoleEnum, TokenTypeEnum } from "../common/enums";
import { ForbiddenException } from "../common/exceptions";
import { TokenService } from "../common/services";



// export interface IRequest extends Request {
//     user?: HydratedDocument<IUser>;
//     decoded?: JwtPayload;
// }

export const authentication = (tokenType = TokenTypeEnum.ACCESS) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const tokenService = new TokenService()

        const { user, decoded } = await tokenService.decodeToken(req.headers.authorization as string, [TokenTypeEnum.ACCESS, TokenTypeEnum.REFRESH]);
        req.user = user;
        req.decoded = decoded;

        // const [schema, credentials] = req.headers.authorization?.split(" ")|| []
        // // console.log({ authorization, schema, credentials });
        // if (!schema || !credentials) {
        //     throw new unauthorizedException("missing authentication key or invalid approach")
        // }

        // switch (schema) {
        //     case 'Bearer':
        //         const { user, decoded } = await tokenService.decodeToken(credentials, [TokenTypeEnum.ACCESS, TokenTypeEnum.REFRESH]);
        //         req.user = user;
        //         req.decoded = decoded;
        //         break;
        //     default:
        //         throw new BadRequestException("missing authentication schema")
        //         break;
        // }
        next()
    }
}

export const authorization = (accessRoles : RoleEnum[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // console.log(req.user.role);
        if (!req.user || !accessRoles.includes(req.user.role)) {
            throw new ForbiddenException("Unauthorized account")
        }

        next()
    }
}

// export const authorization = (accessRoles = [], tokenType = TokenTypeEnum.ACCESS) => {
//   return async (req, res, next) => {
//     if (!req?.headers?.authorization) {
//       throw BadRequestException({ message: "Missing authorization key" });
//     }

//     req.user = await decodeToken({ token: req.headers?.authorization., tokenType });
//     console.log(req.user.role);

//     if (!accessRoles.includes(req.user.role)) {
//       throw ForbiddenException({ message: "Not allowed account" });
//     }

//     next();
//   };
// };