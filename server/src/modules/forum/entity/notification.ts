import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛通知（映射 Prisma 管理的 notifications 表，只读）。
 *
 * 关键约束同 user/post/comment 实体：不继承 BaseEntity（notifications 表只有
 * createdAt 没有 updatedAt），直接继承 CoolBaseEntity 空基类，自行定义列。
 * 仅用于后台查看发送记录 / 已读状态，增改走 forum server（见 service/notification）。
 */
// 表结构由 Prisma 迁移管理，排除 TypeORM 同步
@Entity({ name: 'notifications', synchronize: false })
export class ForumNotificationEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '通知 ID' })
  id: number;

  @Index()
  @Column({ type: 'int', comment: '接收者用户 ID' })
  userId: number;

  @Column({ type: 'text', comment: '类型 comment/reply/like/follow/system' })
  type: string;

  @Column({ type: 'int', array: true, comment: '触发者 ID 列表（只存最近 3 个）', nullable: true })
  actorIds: number[];

  @Column({ type: 'int', comment: '触发者总数（聚合累计事件数）', default: 0 })
  actorCount: number;

  @Column({ type: 'int', comment: '关联帖子 ID，可跳转', nullable: true })
  postId: number;

  @Column({ type: 'int', comment: '关联评论 ID', nullable: true })
  commentId: number;

  @Column({ type: 'int', comment: '群发消息 ID，正文存于 notification_messages 表', nullable: true })
  messageId: number;

  @Column({ type: 'text', comment: '系统通知正文，仅 system 有；新群发经 messageId 解析，存量行仍在本列', nullable: true })
  content: string;

  @Column({ type: 'boolean', comment: '是否已读', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', comment: '通知时间' })
  createdAt: Date;
}
