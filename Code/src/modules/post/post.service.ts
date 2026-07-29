import mongoose, { HydratedDocument, Types } from "mongoose";

import { PostRepository } from "../../DB/repository";
import {
  mentionService,
  MentionService,
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
import { CommentService } from "../comment/comment.service";
import { realtimeGateway, RealtimeGatway } from "../realtime";

export class PostService {
  private readonly postRepository: PostRepository;
  // private readonly userRepository: UserRepository;
  private readonly mentionService: MentionService;
  private readonly commentService: CommentService
  private readonly s3: S3Service;
  private readonly redisService: RedisService;
  private readonly realtimeGateway: RealtimeGatway

  constructor() {
    this.postRepository = new PostRepository();
    // this.userRepository = new UserRepository();
    this.mentionService = mentionService;
    this.commentService = new CommentService();
    this.s3 = s3Service;
    this.redisService = redisService;
    this.realtimeGateway = realtimeGateway;
  }

  private normalizePostResponse(post: any) {
    const data = post?.toJSON?.() ?? post;
    const { attachments, ...restData } = data || {};

    return {
      ...restData,
      files: Array.isArray(restData?.files) ? restData.files : [],
    };
  }


  // ------------------------------- Create Post -------------------------------

  public async createPost(
    { availability, tags, content, files }: CreatePostDto,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.mentionService.validateUserIds(normalizedTags, "tags");
    await this.mentionService.validateMentionedUsers(user._id, normalizedTags);

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
    const createdPost = await this.postRepository.create({
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

    await this.mentionService.sendMentionNotifications({
      user,
      tags: normalizedTags,
      entityId: createdPost._id.toString(),
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
    files = [],
    tags = [],
    removeTags = [],
  }: UpdatePostBodyDto,
  user: HydratedDocument<IUser>,
  ): Promise<IPost> {
    
    //1- Get the post for validation and to get the S3 folder path
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
    

  // 2- Handle S3 assets

  const currentFiles = post.files || [];

  const filesToDelete = currentFiles.filter((file) =>
    removeFiles.includes(file),
    );
    
    
  // 3 - Handle tags - Clean and validate incoming tag IDs

  const normalizedTags = [
    ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
  ];

  const normalizedRemoveTags = [
    ...new Set(
      (removeTags || []).map((tag) => tag.trim()).filter(Boolean),
    ),
  ];

  await this.mentionService.validateUserIds(normalizedTags, "tags");
  await this.mentionService.validateMentionedUsers(user._id, normalizedTags);
  await this.mentionService.validateUserIds(normalizedRemoveTags, "removeTags");

  const tagsToAdd = normalizedTags.map((tag) => toObjectId(tag));

  const tagsToRemove = normalizedRemoveTags.map((tag) =>
    toObjectId(tag),
  );

  
  // 4- Check if the post has content or attachments
  const expectedFilesCount =
      currentFiles.length -
    filesToDelete.length +
    files.length;

  if (!content && !post.content && expectedFilesCount === 0) {
    throw new conflictException(
      "Post must contain content or attachments",
    );
  }

    
  //5 - Upload new files first
  let uploadedFiles: string[] = [];

  try {
    if (files.length) {
      uploadedFiles = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
          path: `post/${post.folderId}`,
        });
      }

    
  //6- Update the post in the database
    const updatedPost = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: postId,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      update: [
        {
          $set: {
            content:
              content !== undefined ? content : "$content",

            availability:
              availability !== undefined
                ? Number(availability)
                : "$availability",

            updatedBy: user._id,

            files: {
              $setUnion: [
                {
                  $setDifference: ["$files", removeFiles],
                },
                uploadedFiles,
              ],
            },

            tags: {
              $setUnion: [
                {
                  $setDifference: ["$tags", tagsToRemove],
                },
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

    if (!updatedPost) {
      throw new BadRequestException(
        "Post wasn't updated successfully",
      );
    }

  //7 - Delete old files only after successful DB update
    if (filesToDelete.length) {
      await this.s3.deleteAssets({
        Keys: filesToDelete.map((file) => ({
          Key: file,
        })),
      });
    }

  //8 - Send notification to tagged users if there are any new tags
    const notifyTaggedUsers = normalizedTags.filter(
      (tag) =>
        !post.tags?.some(
          (existingTag) =>
            existingTag.toString() === tag,
        ),
    );

    // sendMentionNotifications is fire-and-forget — it handles its own errors internally
    this.mentionService.sendMentionNotifications({
      user,
      tags: notifyTaggedUsers,
      entityId: updatedPost._id.toString(),
      message: `${user.username} mentioned you in a post update`,
    });

    return this.normalizePostResponse(updatedPost) as IPost;
  } catch (error) {
    // Rollback newly uploaded files
    if (uploadedFiles.length) {
      try {
        await this.s3.deleteAssets({
          Keys: uploadedFiles.map((file) => ({
            Key: file,
          })),
        });
      } catch (rollbackError) {
        console.error(
          "Failed to rollback uploaded files",
          rollbackError,
        );
      }
    }

    throw error;
  }
}

  // ------------------------------- React Post -------------------------------

  public async reactPost(
    { postId }: ReactPostParamsDto,
    { react }: ReactPostQueryDto,
    user: IUser & { _id: Types.ObjectId },
  ) {
      // console.log(postId , react , user)

    const post = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: toObjectId(postId),
        $or: getAvailability(user as HydratedDocument<IUser>),
      },
      update: {
        ...(Number(react) > 0
          ? { $addToSet: { likes: { react: Number(react), userId: user._id } } }
          : { $pull: { likes: { userId: user._id } } }),
      },
      options: {
        new: true,
        populate: [
          { path: "createdBy" },
          { path: "likes.userId"}
        ]
      }
    });

    // console.log(post);

    if (!post) {
      throw new NotFoundException("Post not found");
    }


    const owner = post.createdBy as HydratedDocument<IUser>;
    const socketIds = await this.redisService.getSockets(owner._id as Types.ObjectId)
    console.log("Socket Id's:" , socketIds)
    if(socketIds.length && Number(react) > 0 ){
      this.realtimeGateway.getIo().to(socketIds).emit("react_post", {
        postId:post._id,
        react:Number(react),
        userId:user._id
      })
    }


    return post;
  }

  // ------------------------------- Get Post -------------------------------

  public async getPost(id: string, user: IUser & { _id: Types.ObjectId }) {
    const post = await this.postRepository.findOne({
      filter: {
        _id: id,
        createdBy: user._id,
      },
      options: {
        populate: [
          {
            path: "comments",
            select: "content",
          },
          {path:"likes" , select:"react userId"}
        ],
      },
    });

    console.log(post)
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
      options: {
        populate: [
          { path: "likes.userId" },
          { path: "createdBy" },
          {path:"tags"},
          { path: "updatedBy" },
          {
            path: "comments",
            populate: [
              {
                path: "replies",
                populate: [
                  {
                    path: "replies",
                  },
                ],
              },
            ],
          },
        ]
      }
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

  // we want to delete all assets that related to this post from s3
  // Delete all comments on it with replies 

  
  public async destroyPost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {

    // 1- Get Post
    const post = await this.postRepository.findOne({
      filter: {
        _id: id,
        $or: [{ createdBy: user._id }, { role: RoleEnum.ADMIN }],
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // 2- Prepare assets keys for deletion
    const assetKeys: { Key: string }[] | undefined = post.files?.map((file) => ({
      Key: file,
    }));

    // 3 - Transactions (DB only - if this failed, we don't want to delete anything from S3)
    // we use Session to handel database deletion and rollback if anything goes wrong in the database operations
    
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Delete Post
      await this.postRepository.deleteOne({
        filter: { _id: id },
        options: { session },
      });

      // Delete Comments
      await this.commentService.deleteCommentsByPostId(
        { postId: id },
        user as HydratedDocument<IUser>,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // 4 - Delete all assets from s3
    try {
      if (assetKeys?.length) {
        await this.s3.deleteAssets({
          Keys: assetKeys,
        });
      }
    } catch (error) {
      console.error(error)
    }

    return post;
  }
}

export default new PostService();
