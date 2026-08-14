import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛广告（映射 Prisma 管理的 adverts 表，读写）。
 *
 * 关键约束同 category/announcement 实体：继承 CoolBaseEntity 空基类，自行定义 id/createdAt/updatedAt，
 * 避免 BaseEntity 带出的 createTime/updateTime/tenantId 污染。
 * 该表由 forum server 的 Prisma 迁移创建（见 server/prisma/migrations/*_add_adverts）。
 */
@Entity('adverts')
export class ForumAdvertEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '广告 ID' })
  id: number;

  @Column({ type: 'text', comment: '广告标题（后台识别 + img alt），可空', nullable: true })
  title: string | null;

  @Column({ type: 'text', comment: 'banner 图片 URL（后台 cl-upload 返回的完整 URL）' })
  image: string;

  @Column({
    type: 'text',
    comment: '广告位置 sidebar/inline',
    default: 'sidebar',
  })
  position: string;

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
