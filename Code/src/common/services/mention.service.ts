import { Types } from "mongoose";

import { UserRepository } from "../../DB/repository";
import { BadRequestException, NotFoundException } from "../exceptions";
import { IUser } from "../interfaces";
import { toObjectId } from "../utils/objectId";
import { notificationService, NotificationService } from "./notification.service";
import { redisService, RedisService } from "./redis.service";

export class MentionService {
  private readonly userRepository: UserRepository;
  private readonly redis: RedisService;
  private readonly notificationService: NotificationService;

  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.notificationService = notificationService;
  }

  /**
   * Validates that every ID in the list corresponds to an existing user.
   */
  async validateUserIds(
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

  /**
   * Validates that every tagged user is actually a friend of the requesting user.
   */
  async validateMentionedUsers(
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
        "One or more tagged users are not in your friends list",
      );
    }
  }

  /**
   * Sends FCM push notifications to all tagged users.
   * Fire-and-forget: does NOT throw — errors are logged instead.
   *
   * IMPORTANT: Only pass NEWLY added tags during updates so existing tags
   * don't receive duplicate notifications.
   */
  async sendMentionNotifications({
    user,
    tags,
    entityId,
    message,
  }: {
    user: Pick<IUser, "username"> & { _id: Types.ObjectId };
    tags: string[];
    entityId: string;
    message: string;
  }): Promise<void> {
    if (!tags?.length) return;

    // 1. Fetch all FCM tokens from Redis in parallel
    const fcmResults = await Promise.all(
      tags.map((tag) => this.redis.getFCMs(tag)),
    );

    // 2. Flatten + deduplicate (a user may be logged-in on multiple devices)
    const fcmTokens = new Set<string>(fcmResults.filter(Boolean).flat());

    if (!fcmTokens.size) return;

    // 3. Fire-and-forget — don't block the API response
    this.notificationService
      .sendNotifications({
        tokens: [...fcmTokens],
        title: `${user.username} mentioned you`,
        body: JSON.stringify({ message, entityId }),
      })
      .catch((err) =>
        console.error("Failed to send mention notifications", err),
      );
  }
}

export const mentionService = new MentionService();
