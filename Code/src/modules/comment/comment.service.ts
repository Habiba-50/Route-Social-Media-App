import { ClientSession, HydratedDocument } from "mongoose";

import { CommentRepository, PostRepository } from "../../DB/repository";
import {
  mentionService,
  MentionService,
  s3Service,
  S3Service,
} from "../../common/services";
import { CreateCommentParamsDto, CreateCommentBodyDto, ReplyOnCommentParamsDto, ReplyOnCommentBodyDto, UpdateCommentParamsDto, UpdateCommentBodyDto, DeleteCommentParamsDto, ReactCommentParamsDto, ReactCommentQueryDto } from "./comment.dto";
import { BadRequestException, conflictException, NotFoundException } from "../../common/exceptions";
import {  IComment, IUser } from "../../common/interfaces";
import { getAvailability } from "../../common/utils/post";
import { toObjectId } from "../../common/utils/objectId";
import { ReactEnum } from "../../common/enums";

export class CommentService {
  private readonly postRepository: PostRepository;
  private readonly commentRepository: CommentRepository;
  private readonly mentionService: MentionService;
  private readonly s3: S3Service;

  constructor() {
    this.postRepository = new PostRepository();
    this.commentRepository = new CommentRepository();
    this.mentionService = mentionService;
    this.s3 = s3Service;
  }

  // ------------------------------- Create Comment ✅ -------------------------------

  public async createComment(
    { postId }: CreateCommentParamsDto,
    { tags, content, files }: CreateCommentBodyDto,
    user: any,
  ): Promise<any> {
    // 1 - Validate post accessibility
    const post = await this.postRepository.findOne({
      filter: {
        _id: postId,
        $or: getAvailability(user as HydratedDocument<IUser>),
      },
    });

    if (!post) throw new NotFoundException("Post not found or not accessible");

    // 2 - Normalize & validate tags
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.mentionService.validateUserIds(normalizedTags, "tags");
    // 
    // await this.mentionService.validateMentionedUsers(user._id, normalizedTags);

    const tagObjectIds = normalizedTags.map((tag) => toObjectId(tag));


    // 3 - Upload attachments
    let attachments: string[] = [];
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `post/${post.folderId}/comments`,
      });
    }

    // 4 - Persist with rollback on failure
    
     const createdComment = await this.commentRepository.create({
        data: {
          content,
          createdBy: user._id,
          files: attachments,
          postId,
          tags: tagObjectIds,
        },
      });
  
      if (!createdComment && attachments.length) {
       await this.s3.deleteAssets({ Keys: attachments.map((key) => ({ Key: key })) })
        .catch((err) => console.error("S3 rollback failed:", err));
       throw new BadRequestException("Failed to create comment");
    }

    // 5 - Notify tagged users (true fire-and-forget)
    this.mentionService
      .sendMentionNotifications({
        user,
        tags: normalizedTags,
        entityId: createdComment._id.toString(),
        message: `${user.username} mentioned you in a comment`,
      })
      .catch((err) => console.error("Mention notification failed:", err));

    return createdComment;
  }

  // ------------------------------- Update Comment ✅ ---------------------------------
  
  public async updateComment(
    { postId, commentId }: UpdateCommentParamsDto,
    {
      content,
      files = [],
      tags = [],
      removeTags = [],
      removeFiles = []
    }: UpdateCommentBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IComment> {

    //1- Get the post for validation and to get the S3 folder path
    const comment = await this.commentRepository.findOne({
      filter: {
        _id: commentId,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      options: {
        populate: [
          {
            path: "postId",
            match: {
              $or: getAvailability(user as HydratedDocument<IUser>),
            }
          }
        ]
      }
    });

    if (!comment) {
      throw new NotFoundException("Comment not found or not accessible");
    }

    if (!comment.postId) {
      throw new NotFoundException("Post not found or not accessible");
    }

    // console.log("comment: ",comment)
    // console.log("commentID: ",comment._id)

    // 2- Handle S3 assets

    const currentFiles = comment.files || [];

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

    if (!content && !comment.content && expectedFilesCount === 0) {
      throw new conflictException(
        "Comment must contain content or attachments",
      );
    }


    //5 - Upload new files first
    let uploadedFiles: string[] = [];

    try {
      if (files.length) {
        uploadedFiles = await this.s3.uploadAssets({
          files: files as Express.Multer.File[],
          path: `post/${postId}/comments/${commentId}`,
        });
      }

      console.log(`path: post/${postId}/comments/${commentId}`)
      //6- Update the comment in the database
      const updatedComment = await this.commentRepository.findOneAndUpdate({
        filter: {
          _id: commentId,
          createdBy: user._id,
          deletedAt: { $exists: false },
        },
        update: [
          {
            $set: {
              content:
                content !== undefined ? content : "$content",
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

      if (!updatedComment) {
        throw new BadRequestException(
          "Comment wasn't updated successfully",
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
          !comment.tags?.some(
            (existingTag) =>
              existingTag.toString() === tag,
          ),
      );

      // sendMentionNotifications is fire-and-forget — it handles its own errors internally
      this.mentionService.sendMentionNotifications({
        user,
        tags: notifyTaggedUsers,
        entityId: updatedComment._id.toString(),
        message: `${user.username} mentioned you in a comment update`,
      });

      return updatedComment as IComment;
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

  // ------------------------------- Reply on Comment ✅ ------------------------------

  public async replyOnComment(
    { postId, commentId }: ReplyOnCommentParamsDto,
    { tags, content, files }: ReplyOnCommentBodyDto,
    user: any,
  ): Promise<HydratedDocument<IComment>> {
    // 1 - Validate comment accessibility
    const comment = await this.commentRepository.findOne({
      filter: {
        _id: toObjectId(commentId),
        postId: toObjectId(postId),
      },
      options: {
        populate: [
          {
            path: "postId",
            match: {
              $or: getAvailability(user as HydratedDocument<IUser>),
            }
          }
        ],
      }
    });

    if (!comment) throw new NotFoundException("Comment not found or not accessible");

    if(!comment.postId) throw new BadRequestException("Post not found or not accessible");

    // 2 - Normalize & validate tags
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.mentionService.validateUserIds(normalizedTags, "tags");
    // 
    // await this.mentionService.validateMentionedUsers(user._id, normalizedTags);

    const tagObjectIds = normalizedTags.map((tag) => toObjectId(tag));


    // 3 - Upload attachments
    let attachments: string[] = [];
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `post/${comment.postId}/comments/${comment._id}/replies`,
      });
    }

    // 4 - Persist with rollback on failure

    const reply = await this.commentRepository.create({
      data: {
        content,
        createdBy: user._id,
        files: attachments,
        postId,
        commentId: toObjectId(commentId),
        tags: tagObjectIds,
      },
    });

    if (!reply && attachments.length) {
      await this.s3.deleteAssets({ Keys: attachments.map((key) => ({ Key: key })) })
        .catch((err) => console.error("S3 rollback failed:", err));
      throw new BadRequestException("Failed to create comment");
    }

    // 5 - Notify tagged users (true fire-and-forget)
    this.mentionService
      .sendMentionNotifications({
        user,
        tags: normalizedTags,
        entityId: reply._id.toString(),
        message: `${user.username} mentioned you in a comment`,
      })
      .catch((err) => console.error("Mention notification failed:", err));

    return reply;
  }

  // ------------------------------- Delete Comment ✅ ---------------------------------
  
  public async deleteComment(
    { postId, commentId }: DeleteCommentParamsDto,
    user: HydratedDocument<IUser>,
  ): Promise<any> {
    const comment = await this.commentRepository.findOneAndUpdate({
      filter: {
        _id: toObjectId(commentId),
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      update: [
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: user._id,
          },
        },
      ],
      options: {
        populate: [
          {
            path: "postId",
            match: {
              $or: getAvailability(user as HydratedDocument<IUser>),
            }
          }
        ]
      }
    });

    if (!comment) {
      throw new conflictException("Comment not found or not accessible");
    }
  }

  // ------------------------------- Restore Comment ✅ ---------------------------------
  
  public async restoreComment(
    { postId, commentId }: DeleteCommentParamsDto,
    user: HydratedDocument<IUser>,
  ): Promise<any> {
    const comment = await this.commentRepository.findOneAndUpdate({
      filter: {
        _id: toObjectId(commentId),
        createdBy: user._id,
        deletedAt: { $exists: true },
      },
      update: [
        {
          $unset: "deletedAt",
        },
      ],
      options: {
        populate: [
          {
            path: "postId",
            match: {
              $or: getAvailability(user as HydratedDocument<IUser>),
            }
          }
        ]
      }
    });

    if (!comment) {
      throw new conflictException("Comment not found or not accessible");
    }
    
  }

  // ------------------------------- Like Comment  ✅ ---------------------------------
  
  public async reactComment(
    { postId, commentId }: ReactCommentParamsDto,
    { react }: ReactCommentQueryDto,
    user: HydratedDocument<IUser>,
  ): Promise<any> {
    const comment = await this.commentRepository.findOneAndUpdate({
      filter: {
        _id: toObjectId(commentId),
        postId: toObjectId(postId),
        $or: getAvailability(user as HydratedDocument<IUser>),
      },
      update: {
        ...(Number(react) > 0
          ? { $addToSet: { likes: { react: ReactEnum[react], userId: user._id } } }
          : { $pull: { likes: user._id } }),
      },
      options: { new: true },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    return comment.toJSON();
  }

  // ------------------------------- Get Comment ✅ ---------------------------------
  
  public async getComments({commentId}: {commentId: string}) {
    const comment = await this.commentRepository.findOne({
      filter: {
        _id: toObjectId(commentId),
        deletedAt: null
      },
      options: {
        populate: [
          {
            path: "replies"
          }
        ]
      }
    });
    
    if (!comment) {
      throw new Error("Post not found");
    }
    
    return comment;
  }

  // ------------------------------- Destroy Comment ✅ ---------------------------------

  public async destroyComment(
    { postId, commentId }: DeleteCommentParamsDto,
    user: HydratedDocument<IUser>,
  ): Promise<any> {
    const comment = await this.commentRepository.findOneAndDelete({
      filter: {
        _id: toObjectId(commentId),
        createdBy: user._id,
        deletedAt: { $exists: true },
      },
      options: {
        populate: [
          {
            path: "postId",
            match: {
              $or: getAvailability(user as HydratedDocument<IUser>),
            }
          }
        ]
      }
    });

    if (!comment) {
      throw new conflictException("Comment not found or not accessible");
    }
    
    if (comment.files?.length) {
      await this.s3.deleteAssets({
        Keys: comment.files.map((key) => ({ Key: key })),
      });
    }
    
    return { message: "Comment deleted successfully" };
  }

  // ------------------------------- Delete Comments By postId ✅ ---------------------------------
  public async deleteCommentsByPostId(
    { postId }: { postId: string },
    user: HydratedDocument<IUser>,
    session?: ClientSession,
  ): Promise<any> {
     await this.commentRepository.deleteMany({
      filter: {
        postId: toObjectId(postId),
        createdBy: user._id,
        $or: getAvailability(user as HydratedDocument<IUser>),
      },
    });
    
    return { message: "Comments deleted successfully" };
  }
}

export const commentService = new CommentService();
