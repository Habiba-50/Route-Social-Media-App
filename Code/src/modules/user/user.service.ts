import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces";
import { decrypt } from "../../common/utils";
import { JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../../config/config";
import { conflictException } from "../../common/exceptions";
import { RedisService, TokenService } from "../../common/services";
import { LogoutEnum } from "../../common/enums";


export class UserService {

    private readonly tokenService: TokenService;
    private readonly redisService: RedisService;


    constructor() {
       this.tokenService = new TokenService();
       this.redisService = new RedisService();
    }

// ------------------------------------ Get Profile -----------------------------------------------

    public async profile(user?: HydratedDocument<IUser>): Promise<any> {
        if (user?.phone) {
            user.phone = await decrypt(user.phone)  ;
        }
        return user;
    }

// ------------------------------------ Rotate Token -----------------------------------------------

    public async rotateToken(user : HydratedDocument<IUser>, { sub, jti, iat }:JwtPayload, issuer:string) : Promise<any> {

        if ((iat as number + ACCESS_TOKEN_EXPIRY) * 1000 > Date.now() + (5 * 60 * 1000)) {
            const remainingTime = (iat as number + ACCESS_TOKEN_EXPIRY) * 1000 - Date.now();
            throw new conflictException(`Current access token is still valid, remaining time : ${Math.floor(remainingTime / 60000)} minute`)
        }

        await this.tokenService.createRevokeToken({
            sub: sub as string,
            jti: jti as string,
            ttl: iat as number + REFRESH_TOKEN_EXPIRY
        })


        const { access_token, refresh_token } = await this.tokenService.createLoginCredentials({ user, issuer })

        return { access_token, refresh_token }
    };

    // -----------------------------Logout-----------------------------

    public async logout (flag : LogoutEnum , user : HydratedDocument<IUser>, { jti, iat, sub } : JwtPayload) : Promise<any> {

        let status = 200

        switch (flag) {
            case LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();

                const result = await this.redisService.deleteKey(await this.redisService.keys(this.redisService.baseRevokeTokenKey(sub as string)));
                console.log("Logout all sessions result:", result);
                break;

            default:

                await this.tokenService.createRevokeToken({
                    sub: sub as string,
                    jti: jti as string,
                    ttl: iat as number + REFRESH_TOKEN_EXPIRY,
                });
                status = 201
                break;
        }


        return status;
    }
}

export default new UserService()