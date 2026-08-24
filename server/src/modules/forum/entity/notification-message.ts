import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛系统通知群发消息（映射 Prisma 管理的 notification_messages 表，只读）。
 * 广播正文只存一份于此，通知行通过 messageId 引用，避免逐用户冗余存储。
 * 表结构由 Prisma 迁移管理，排除 TypeORM 同步。
 */
@Entity({ name: 'notification_messages', synchronize: false })
export class ForumNotificationMessageEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '消息 ID' })
  id: number;

  @Column({ type: 'text', comment: '群发正文' })
  content: string;

  @Column({ type: 'int', comment: '跳转帖子 ID，可空', nullable: true })
  postId: number;

  @Column({ type: 'int', comment: '实际送达用户数', default: 0 })
  sentCount: number;

  @Column({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;
}
