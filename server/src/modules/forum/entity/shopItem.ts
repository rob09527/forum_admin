import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 装饰商品目录（映射 Prisma 管理的 shop_items 表，读写）。
 *
 * 表结构由 forum server 的 Prisma 迁移创建（server/prisma/migrations/*_add_points_spending），
 * 这里仅手抄 entity 供后台读写，synchronize 必须关闭、绝不参与 TypeORM 同步。
 * 价格/时效/上下架走 DB（本表），全局规则参数走 Redis 配置，见 service/config.ts。
 */
// 表结构由 Prisma 迁移管理，排除 TypeORM 同步
@Entity({ name: 'shop_items', synchronize: false })
export class ForumShopItemEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '商品 ID' })
  id: number;

  @Column({ type: 'text', comment: '装饰类型：username_color(用户名颜色) | title(专属称号)，同类互相覆盖、不同类共存' })
  type: string;

  @Column({ type: 'text', comment: '商品名（前台展示，如「幻紫」）' })
  name: string;

  @Column({ type: 'text', comment: '渲染值：颜色类为 CSS 色值/渐变；称号类为称号文本。购买时快照到 UserDecoration 与 User 槽位' })
  renderValue: string;

  @Column({ type: 'text', comment: '附加样式 key（称号徽章配色 amber/violet/emerald），颜色类为 null', nullable: true })
  renderStyle: string | null;

  @Column({ type: 'int', comment: '价格（鸡腿），改价不影响已售出（购买即快照渲染值）' })
  price: number;

  @Column({ type: 'int', comment: '时效天数（入门色 7 / 精选色与称号 30）' })
  durationDays: number;

  @Column({ type: 'boolean', comment: '是否上架；下架后商城隐藏、不可购买，已持有者不受影响', default: true })
  isActive: boolean;

  @Column({ type: 'int', comment: '排序权重，越小越靠前', default: 0 })
  sortOrder: number;

  @Column({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间' })
  updatedAt: Date;
}
