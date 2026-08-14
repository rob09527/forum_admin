import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛公告（映射 Prisma 管理的 announcements 表，读写）。
 *
 * 关键约束同 category 实体：继承 CoolBaseEntity 空基类，自行定义 id/createdAt/updatedAt，
 * 避免 BaseEntity 带出的 createTime/updateTime/tenantId 污染。
 * 该表由 forum server 的 Prisma 迁移创建（见 server/prisma/migrations/*_add_announcements）。
 */
@Entity('announcements')
export class ForumAnnouncementEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '公告 ID' })
  id: number;

  @Column({ type: 'text', comment: '公告标题' })
  title: string;

  @Column({
    type: 'text',
    comment: '公告类型 normal/important/urgent/activity',
    default: 'normal',
  })
  type: string;

  @Column({ type: 'text', comment: '跳转链接（站内路径或外链），可空', nullable: true })
  link: string | null;

  @Column({ type: 'int', comment: '排序权重，越大越靠前', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', comment: '是否上线', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间' })
  updatedAt: Date;
}
