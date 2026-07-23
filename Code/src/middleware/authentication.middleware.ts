import type { NextFunction, Request, Response } from "express";
import { TokenTypeEnum } from "../common/enums";
import { TokenService } from "../common/services";


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

