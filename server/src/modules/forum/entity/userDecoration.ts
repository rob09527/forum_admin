import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 用户装饰持有记录（映射 Prisma 管理的 user_decorations 表，只读）。
 *
 * 用于客诉排查（「我的颜色没了」「我没买过这个」）与续费入口展示。
 * 一商品一行（@@unique(userId, itemId)），续费=延长 expireAt；过期记录不删除 [R46]。
 * 表结构由 forum server 的 Prisma 迁移创建，synchronize 必须关闭。
 */
// 表结构由 Prisma 迁移管理，排除 TypeORM 同步
@Entity({ name: 'user_decorations', synchronize: false })
export class ForumUserDecorationEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '持有记录 ID' })
  id: number;

  @Column({ type: 'int', comment: '持有用户 ID' })
  userId: number;

  @Column({ type: 'int', comment: '商品 ID；续费需要跳回商品，故商品禁删只能下架' })
  itemId: number;

  @Column({ type: 'text', comment: '装饰类型（冗余自 ShopItem.type：username_color | title）' })
  type: string;

  @Column({ type: 'text', comment: '购买时快照的渲染值 —— 商品事后改价/改值/下架不回溯已购用户' })
  renderValue: string;

  @Column({ type: 'text', comment: '购买时快照的样式 key（称号徽章配色），颜色类为 null', nullable: true })
  renderStyle: string | null;

  @Column({ type: 'int', comment: '实付价格快照（后台客诉排查「我当时花了多少」）' })
  price: number;

  @Column({ type: 'timestamp', comment: '本次生效起始时间' })
  startAt: Date;

  @Column({ type: 'timestamp', comment: '到期时间；过期记录不删除，置灰展示 + 一键续费' })
  expireAt: Date;

  @Column({ type: 'timestamp', comment: '到期通知已发送的时间；null 表示未发（幂等标记）', nullable: true })
  expiredNotifiedAt: Date | null;

  @Column({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间' })
  updatedAt: Date;
}
