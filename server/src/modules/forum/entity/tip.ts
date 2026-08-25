import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 打赏记录（映射 Prisma 管理的 tips 表，只读；账本，不可撤销不追溯 [R53]）。
 *
 * 裸 ID 不建外键 —— 账务记录生命周期独立于业务内容 [T4]：
 * 帖子/评论被删后本行保留，后台展示按「内容已删除」渲染。
 * 表结构由 forum server 的 Prisma 迁移创建，synchronize 必须关闭。
 */
// 表结构由 Prisma 迁移管理，排除 TypeORM 同步
@Entity({ name: 'tips', synchronize: false })
export class ForumTipEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '打赏记录 ID' })
  id: number;

  @Column({ type: 'int', comment: '打赏者 ID' })
  fromUserId: number;

  @Column({ type: 'int', comment: '接收者 ID（内容作者）。冗余存储而非 JOIN 内容表取 —— 内容删除后仍能按接收方聚合 [T4]' })
  toUserId: number;

  @Column({ type: 'text', comment: '打赏目标类型：post | comment' })
  targetType: string;

  @Column({ type: 'int', comment: '目标 ID。裸 ID 不建外键，与 PointLog.refId 同口径；内容删除后本行保留' })
  targetId: number;

  @Column({ type: 'int', comment: '打赏金额（鸡腿）；不抽水，全额到账 [R47]' })
  amount: number;

  @Column({ type: 'text', comment: '打赏留言，最长 20 字，选填 [1.5.3]', nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', comment: '打赏时间' })
  createdAt: Date;
}
