import { HydratedDocument, Types } from "mongoose";

import { PostRepository, UserRepository } from "../../DB/repository";
import {
  notificationService,
  NotificationService,
  redisService,
  RedisService,
  s3Service,
  S3Service,
} from "../../common/services";
import {
  CreatePostDto,
  ReactPostParamsDto,
  ReactPostQueryDto,
  UpdatePostBodyDto,
  UpdatePostParamsDto,
} from "./post.dto";
import {
  BadRequestException,
  conflictException,
  NotFoundException,
} from "../../common/exceptions";
import { randomUUID } from "node:crypto";
import { IPaginate, IPost, IUser } from "../../common/interfaces";
import { RoleEnum } from "../../common/enums";
import { getAvailability } from "../../common/utils/post";
import { toObjectId } from "../../common/utils/objectId";

export class PostService {
  private readonly postRepository: PostRepository;
  private readonly userRepository: UserRepository;
  private readonly redis: RedisService;
  private readonly notificationService: NotificationService;
  private readonly s3: S3Service;

  constructor() {
    this.postRepository = new PostRepository();
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.notificationService = notificationService;
    this.s3 = s3Service;
  }

  private normalizePostResponse(post: any) {
    const data = post?.toJSON?.() ?? post;
    const { attachments, ...restData } = data || {};

    return {
      ...restData,
      files: Array.isArray(restData?.files) ? restData.files : [],
    };
  }

  private async validateUserIds(
    ids: string[],
    fieldName: string = "tags",
  ): Promise<void> {
    if (!ids.length) return;

    const normalizedIds = [
      ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
    ];

    if (!normalizedIds.length) return;

    const users = await this.userRepository.findAll({
      filter: {
        _id: {
          $in: normalizedIds.map((id) => toObjectId(id)),
        },
      },
    });

    if (!users || users.length !== normalizedIds.length) {
      throw new NotFoundException(
        `Some or all ${fieldName} IDs not found in the system.`,
      );
    }
  }

  private async validateMentionedUsers(
    userId: Types.ObjectId,
    ids: string[],
  ): Promise<void> {
    if (!ids.length) return;

    const tagObjectIds = ids.map((id) => toObjectId(id));

    const isFriendAndExist = await this.userRepository.countDocuments({
      _id: userId,
      friends: { $all: tagObjectIds },
    });

    if (isFriendAndExist === 0) {
      throw new BadRequestException(
        "You can only tag users who are in your friends list",
      );
    }
  }

  private async sendMentionNotifications({
    user,
    tags, // Ensure you only pass NEWLY added tags during updates!
    postId,
    message,
  }: {
    user: any;
    tags: string[];
    postId: string;
    message: string;
  }): Promise<void> {
    if (!tags?.length) return;

    // 1. Fetch all FCM tokens from Redis in parallel (promise.all to much faster!)
    const fcmResults = await Promise.all(
      tags.map((tag) => this.redis.getFCMs(tag)),
    );

    // 2. Flatten the arrays Because each user may have their account open from two or three devices at the same time
    // and filter out duplicates using Set
    const fcmTokens = new Set<string>(fcmResults.filter(Boolean).flat());

    if (!fcmTokens.size) return;

    // 3. Send notifications asynchronously without awaiting it if you want faster API response
    this.notificationService
      .sendNotifications({
        tokens: [...fcmTokens],
        title: `${user.username} mentioned you`,
        body: JSON.stringify({
          message,
          postId,
        }),
      })
      .catch((err) =>
        console.error("Failed to send mention notifications", err),
      );
  }

  // ------------------------------- Create Post -------------------------------

  public async createPost(
    { availability, tags, content, files }: CreatePostDto,
    user: any,
  ): Promise<any> {
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.validateUserIds(normalizedTags, "tags");
    await this.validateMentionedUsers(user._id, normalizedTags);

    const tagObjectIds = normalizedTags.map((tag) => toObjectId(tag));

    // Generate folder id
    const folderId = randomUUID();

    // Uploaded files urls
    let attachments: string[] = [];

    // Upload files to S3
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `post/${folderId}`,
      });
    }

    // Create post
    const createdPost: any = await this.postRepository.create({
      data: {
        content,
        createdBy: user._id,
        files: attachments,
        folderId,
        availability,
        tags: tagObjectIds,
      },
    });

    // Fail safe rollback
    if (!createdPost) {
      if (attachments?.length) {
        await this.s3.deleteAssets({
          Keys: attachments.map((ele) => ({
            Key: ele,
          })),
        });
      }

      throw new BadRequestException("Failed to create post");
    }

    await this.sendMentionNotifications({
      user,
      tags: normalizedTags,
      postId: createdPost._id.toString(),
      message: `${user.username} mentioned you in a post`,
    });

    return this.normalizePostResponse(createdPost);
  }

  // ------------------------------- Update Post -------------------------------

  public async updatePost(
    { postId }: UpdatePostParamsDto,
    {
      content,
      availability,
      removeFiles = [],
      files = [], // Input files from the request body
      tags = [],
      removeTags = [],
    }: UpdatePostBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IPost> {
    // 1. Fetch the post for validation and to get the S3 folder path
    const post = await this.postRepository.findOne({
      filter: {
        _id: postId,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    // 2. Handle S3 assets
    let uploadedFiles: string[] = [];
    const currentFiles = post.files || [];
    const filesToDelete = currentFiles.filter((file) =>
      removeFiles.includes(file),
    );

    if (filesToDelete.length) {
      await this.s3.deleteAssets({
        Keys: filesToDelete.map((file) => ({ Key: file })),
      });
    }

    if (files.length) {
      uploadedFiles = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `post/${post.folderId}`,
      });
    }

    // Clean and validate incoming tag IDs
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];
    const normalizedRemoveTags = [
      ...new Set((removeTags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.validateUserIds(normalizedTags, "tags");
    await this.validateMentionedUsers(user._id, normalizedTags);
    await this.validateUserIds(normalizedRemoveTags, "removeTags");

    const tagsToAdd = normalizedTags.map((tag) => toObjectId(tag));
    const tagsToRemove = normalizedRemoveTags.map((tag) => toObjectId(tag));

    // 3. Validate post requirements based on the expected final attachments count
    const expectedfilesCount =
      currentFiles.length - filesToDelete.length + uploadedFiles.length;
    if (!content && !post.content && expectedfilesCount === 0) {
      throw new conflictException("Post must contain content or attachments");
    }

    // 4. Smart update using an Aggregation Pipeline inside findOneAndUpdate
    const updatedPost = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: postId,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      // Array brackets indicate the use of an Aggregation Pipeline
      update: [
        {
          $set: {
            // If content is provided, update it; otherwise, retain the current value from DB
            content: content !== undefined ? content : "$content",

            // Update availability and cast to Number if provided
            availability:
              availability !== undefined
                ? Number(availability)
                : "$availability",

            updatedBy: user._id,

            // Remove specified files then merge new ones to ensure uniqueness
            files: {
              $setUnion: [
                { $setDifference: ["$files", removeFiles] },
                uploadedFiles,
              ],
            },

            // Remove specified tags then merge new ones to ensure uniqueness
            tags: {
              $setUnion: [
                { $setDifference: ["$tags", tagsToRemove] },
                tagsToAdd,
              ],
            },
          },
        },
      ],
      options: {
        new: true,
      },
    });

    // // Notify ONLY newly tagged users in this update
    const notifyTaggedUsers = normalizedTags.filter(
      (tag) =>
        !post.tags?.some((existingTag) => existingTag.toString() === tag),
    );
    if (updatedPost) {
      await this.sendMentionNotifications({
        user,
        tags: notifyTaggedUsers,
        postId: updatedPost._id.toString(),
        message: `${user.username} mentioned you in a post update`,
      });
    }

    return this.normalizePostResponse(updatedPost) as IPost;
  }

  // ------------------------------- React Post -------------------------------

  public async reactPost(
    { postId }: ReactPostParamsDto,
    { react }: ReactPostQueryDto,
    user: IUser & { _id: Types.ObjectId },
  ) {
    //   console.log(postId)

    const post = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: getAvailability(user as HydratedDocument<IUser>),
      },
      update: {
        ...(Number(react) > 0
          ? { $addToSet: { likes: { react: Number(react), userId: user._id } } }
          : { $pull: { likes: user._id } }),
      },
      options: { new: true },
    });

    console.log(post?.likes);

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    return post.toJSON();
  }

  // ------------------------------- Get Post -------------------------------

  public async getPost(id: string, user: IUser & { _id: Types.ObjectId }) {
    const post = await this.postRepository.findOne({
      filter: {
        _id: id,
        createdBy: user._id,
      },
    });

    if (!post || post.deletedAt) {
      throw new Error("Post not found");
    }

    return this.normalizePostResponse(post);
  }

  // ------------------------- Get All Posts with pagination ----------------------
  public async getPostList(
    {
      page,
      size,
      search,
    }: {
      page: number | string | undefined;
      size: number | string | undefined;
      search?: string | undefined;
    },
    user: IUser & { _id: Types.ObjectId },
  ): Promise<IPaginate<IPost>> {
    const posts = await this.postRepository.paginate({
      filter: {
        $or: getAvailability(user as HydratedDocument<IUser>),
        ...(search ? { content: { $regex: search, $options: "i" } } : {}),
        // exceptedFor: { $in: [user._id] }
      },
      page,
      size,
    });

    return {
      ...posts,
      docs: (posts.docs || []).map((post) => this.normalizePostResponse(post)),
    };
  }

  // ------------------------------- Delete Post -------------------------------

  public async deletePost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    // const post = await this.postRepository.findOne({
    //     filter: {
    //         _id: id,
    //         createdBy: user._id
    //     }
    // });

    const result = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: id,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      update: {
        deletedAt: new Date(),
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!result) {
      throw new Error("Post not found");
    }

    return result;
  }

  // ------------------------------- Restore Post -------------------------------

  // public async restorePost(id: string, user: IUser & {_id:Types.ObjectId}) : Promise<any> {

  //     const result = await this.postRepository.findOneAndUpdate({
  //         filter: {
  //             _id: id,
  //             createdBy: user._id || user.role === RoleEnum.ADMIN,
  //             deletedAt: { $exists: true }
  //         },
  //         update: {
  //             deletedAt: undefined,
  //             updatedBy: user._id
  //         },
  //         options: { new: true }
  //     });

  //     if (!result) {
  //         throw new Error("Post not found");
  //     }

  //     return result;
  // }

  public async restorePost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    const result = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: id,
        $or: [{ createdBy: user._id }, { role: RoleEnum.ADMIN }],
        deletedAt: { $exists: true },
      },
      update: {
        $unset: {
          deletedAt: 1,
        },
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!result) {
      throw new Error("Post not found");
    }

    return result;
  }

  // ------------------------------- Destroy Post -------------------------------

  public async destroyPost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    const result = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: id,
        $or: [{ createdBy: user._id }, { role: RoleEnum.ADMIN }],
        deletedAt: { $exists: true },
      },
      update: {
        $unset: {
          deletedAt: 1,
        },
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!result) {
      throw new Error("Post not found");
    }

    return result;
  }
}

export default new PostService();
