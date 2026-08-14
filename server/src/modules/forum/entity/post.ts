import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛帖子（映射 Prisma 管理的 posts 表，只读）。
 *
 * 关键约束：
 * - 不继承 BaseEntity（它带 createTime/updateTime/tenantId，posts 表没有这些列）；
 *   直接继承 CoolBaseEntity 空基类，自行定义 id/createdAt/updatedAt。
 * - content 为 Markdown 正文，较大；列表 select 里不含它，详情走 info 按需拉取。
 */
@Entity('posts')
export class ForumPostEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '帖子 ID' })
  id: number;

  @Column({ type: 'text', comment: '帖子标题' })
  title: string;

  @Column({ type: 'text', comment: 'Markdown 正文', nullable: true })
  content: string;

  @Column({ type: 'text', comment: '板块 slug（DB 驱动，见 categories 表，勿在此处硬编码清单）' })
  category: string;

  @Column({ type: 'text', array: true, comment: '标签列表', default: '{}' })
  tags: string[];

  @Column({ type: 'int', comment: '作者 ID' })
  authorId: number;

  @Column({ type: 'int', comment: '浏览量', default: 0 })
  viewCount: number;

  @Column({ type: 'int', comment: '点赞数', default: 0 })
  likeCount: number;

  @Column({ type: 'int', comment: '评论数', default: 0 })
  commentCount: number;

  @Column({ type: 'boolean', comment: '是否置顶', default: false })
  isPinned: boolean;

  @Column({ type: 'timestamp', comment: '发布时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间', nullable: true })
  updatedAt: Date;
}
