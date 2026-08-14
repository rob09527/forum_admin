import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛板块分类（映射 Prisma 管理的 categories 表，读写）。
 *
 * 关键约束同 user/post 实体：继承 CoolBaseEntity 空基类，
 * 自行定义 id/createdAt/updatedAt，避免 BaseEntity 带出的 createTime/updateTime/tenantId 污染。
 * 该表由 forum server 的 Prisma 迁移创建（见 server/prisma/migrations/*_add_categories）。
 */
// 表结构由 Prisma 迁移管理，排除 TypeORM 同步
@Entity({ name: 'categories', synchronize: false })
export class ForumCategoryEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '分类 ID' })
  id: number;

  @Index({ unique: true })
  @Column({ type: 'text', comment: '板块 slug，对应 posts.category 字段值' })
  slug: string;

  @Column({ type: 'text', comment: '板块中文名' })
  name: string;

  @Column({ type: 'text', comment: '板块 emoji 图标', default: '📂' })
  icon: string;

  @Column({ type: 'int', comment: '排序权重，越小越靠前', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', comment: '是否启用（禁用后从 /api/categories 隐藏、发帖不可选）', default: true })
  isEnabled: boolean;

  @Column({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间' })
  updatedAt: Date;
}
