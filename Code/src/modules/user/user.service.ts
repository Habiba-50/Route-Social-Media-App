import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces";
import { decrypt } from "../../common/utils";
import { JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../../config/config";
import { conflictException } from "../../common/exceptions";
import { RedisService, S3Service, TokenService } from "../../common/services";
import { LogoutEnum, StorageApproachEnum, UploadApproachEnum } from "../../common/enums";
import { UserRepository } from "../../DB/repository";


export class UserService {
  private readonly userRepository: UserRepository
  private readonly tokenService: TokenService;
  private readonly redisService: RedisService;
  private readonly s3: S3Service

  constructor() {
    this.userRepository = new UserRepository()
    this.tokenService = new TokenService();
    this.redisService = new RedisService();
    this.s3 = new S3Service()
  }

  // ------------------------------------ Get Profile -----------------------------------------------

  public async profile(user?: HydratedDocument<IUser>): Promise<any> {
    if (user?.phone) {
      user.phone = await decrypt(user.phone);
    }
    return user;
  }

  // ------------------------------------ Rotate Token -----------------------------------------------

  public async rotateToken(
    user: HydratedDocument<IUser>,
    { sub, jti, iat }: JwtPayload,
    issuer: string,
  ): Promise<any> {
    if (
      ((iat as number) + ACCESS_TOKEN_EXPIRY) * 1000 >
      Date.now() + 5 * 60 * 1000
    ) {
      const remainingTime =
        ((iat as number) + ACCESS_TOKEN_EXPIRY) * 1000 - Date.now();
      throw new conflictException(
        `Current access token is still valid, remaining time : ${Math.floor(remainingTime / 60000)} minute`,
      );
    }

    await this.tokenService.createRevokeToken({
      sub: sub as string,
      jti: jti as string,
      ttl: (iat as number) + REFRESH_TOKEN_EXPIRY,
    });

    const { access_token, refresh_token } =
      await this.tokenService.createLoginCredentials({ user, issuer });

    return { access_token, refresh_token };
  }

  // -----------------------------Logout-----------------------------

  public async logout(
    flag: LogoutEnum,
    user: HydratedDocument<IUser>,
    { jti, iat, sub }: JwtPayload,
  ): Promise<any> {
    let status = 200;

    switch (flag) {
      case LogoutEnum.ALL:
        user.changeCredentialsTime = new Date();
        await user.save();

        const result = await this.redisService.deleteKey(
          await this.redisService.keys(
            this.redisService.baseRevokeTokenKey(sub as string),
          ),
        );
        console.log("Logout all sessions result:", result);
        break;

      default:
        await this.tokenService.createRevokeToken({
          sub: sub as string,
          jti: jti as string,
          ttl: (iat as number) + REFRESH_TOKEN_EXPIRY,
        });
        status = 201;
        break;
    }

    return status;
  }

  // -------------------------- Profile Image ---------------------------------------    
  public async profileImage(user: HydratedDocument<IUser>, file: Express.Multer.File): Promise<any> {
    const { Key } = await this.s3.uploadLargeAsset({
      file,
      path: `Users/${user._id.toString()}/Profile`,
      storageApproach: StorageApproachEnum.DISK
    })

    // console.log(result);
    user.profilePicture = Key as string;

    await user.save()

    return user.toJSON()
  }

  // -----------------------------  Profile Image Presigned URL ------------------------------

  public async profileImagePresignedUrl(
    user: HydratedDocument<IUser>,
    { ContentType, Originalname }: { ContentType: string, Originalname: string })
    : Promise<{ presignedUrl: string, user: HydratedDocument<IUser> }> {
    
    const oldPic = user.profilePicture

    const { presignedUrl, Key } = await this.s3.createPresignedUploadLink({
      path: `Users/${user._id.toString()}/Profile`,
      ContentType,
      Originalname,
    })

    if(oldPic) {
      await this.s3.deleteAsset({ Key: oldPic })
    }

    user.profilePicture = Key as string
    await user.save()

    return {
      presignedUrl,
      user
    }
  }


  // -------------------------- Profile Cover Images ---------------------------------------
  public async profileCoverImages(user: HydratedDocument<IUser>, files: Express.Multer.File[]): Promise<any> {
   
    const oldCovers = user.profileCoveredPictures
    const urls = await this.s3.uploadAssets({
      files,
      path: `Users/${user._id.toString()}/Profile/Covers`,
      storageApproach: StorageApproachEnum.DISK,
      uploadApproach: UploadApproachEnum.SMALL
    })

    // console.log(result);
    user.profileCoveredPictures = [...(user.profileCoveredPictures || []), ...urls] as string[]

    await user.save()

    if(oldCovers && oldCovers.length > 0) {
      await this.s3.deleteAssets({ Keys: oldCovers.map((key) => ({ Key: key })) })
    }
    return user.toJSON()
  }


  // ------------------------------------------Delete User-------------------------------------------
  public async deleteUser(userId: string ): Promise<boolean> {

    const user = await this.userRepository.findOne({ filter: { _id: userId } })
    if (!user) {
      throw new conflictException("User not found")
    }
    
    if (user.deletedAt) {
      throw new conflictException("User already deleted")
    }
    await this.userRepository.updateOne({
      filter: { _id: userId },
      update: {
        deletedAt: new Date(),
        $unset: { restoredAt: 1 }
      }
    });
    return true

  }

  // ------------------------------------------Restore User-------------------------------------------
  public async restoreUser(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ filter: { _id: userId } })
    console.log(user)
    if (!user) {
      throw new conflictException("User not found")
    }
    if (!user.deletedAt) {
      throw new conflictException("User is not deleted")
    }
    await this.userRepository.updateOne({
      filter: { _id: userId },
      update: {
        $unset: { deletedAt: 1 },
        restoredAt: new Date()
      }
    })
    return true
  }

  // ------------------------------------------Get All Active Users-------------------------------------------
  public async getAllActiveUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: false } } })
    return users
  }

  // ------------------------------------------Get All Deleted Users-------------------------------------------
  public async getAllDeletedUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: true } } })
    return users
  }

  // ------------------------------------------Get All Users-------------------------------------------
  public async getAllUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: {} })
    return users
  }

  // ------------------------------------------ Update Profile -------------------------------------------
  public async updateProfile(user: HydratedDocument<IUser>, updateData: Partial<IUser>): Promise<any> {
    if (user.deletedAt) {
      throw new conflictException("Can't update profile of deleted user!")
    }
    const updatedUser = await this.userRepository.updateOne({ filter: { _id: user._id }, update: { $set: updateData }  })
    
    return updatedUser
  }

  // ------------------------------------------ Hard Delete User -------------------------------------------

  public async hardDeleteUser(userId: string, force: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ filter: { _id: userId } })
    if(!user) {
      throw new conflictException("User not found")
    }
    if(user.deletedAt ||  force === "true") {
      const result = await this.userRepository.deleteOne({ filter: { _id: user._id }, options: { force: true } })
      return result.deletedCount > 0
    } else {
      throw new conflictException("User is not deleted, pass force=true to delete user permanently")
    }
  }
}

export default new UserService()