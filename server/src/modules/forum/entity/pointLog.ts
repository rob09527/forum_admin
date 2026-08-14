import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛积分流水（映射 Prisma 管理的 point_logs 表，只读）。
 *
 * 关键约束同 user/post/comment 实体：继承 CoolBaseEntity 空基类，
 * 自行定义 id/createdAt，避免 BaseEntity 带出的 createTime/updateTime/tenantId 污染。
 */
@Entity('point_logs')
export class ForumPointLogEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '流水 ID' })
  id: number;

  @Column({ type: 'int', comment: '用户 ID' })
  userId: number;

  @Column({ type: 'text', comment: '积分来源 checkin/post/comment/liked/transfer' })
  type: string;

  @Column({ type: 'int', comment: '变动值，正数加分，transfer 管理调整可为负' })
  delta: number;

  @Column({ type: 'int', comment: '变动后的鸡腿余额' })
  balanceAfter: number;

  @Column({ type: 'int', comment: '关联的帖子/评论 ID，无关联为 null', nullable: true })
  refId: number;

  @Column({ type: 'text', comment: '操作者（管理调整 transfer 时是哪个管理员），非 transfer 为 null', nullable: true })
  operator: string | null;

  @Column({ type: 'timestamp', comment: '变动时间' })
  createdAt: Date;
}
