import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛评论（映射 Prisma 管理的 comments 表，只读）。
 *
 * 关键约束同 user/post 实体：不继承 BaseEntity，直接继承 CoolBaseEntity 空基类，
 * 自行定义 id/createdAt，避免 BaseEntity 带出的 createTime/updateTime/tenantId 污染。
 */
@Entity('comments')
export class ForumCommentEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '评论 ID' })
  id: number;

  @Column({ type: 'text', comment: 'Markdown 格式评论内容' })
  content: string;

  @Column({ type: 'int', comment: '所属帖子 ID' })
  postId: number;

  @Column({ type: 'int', comment: '评论者 ID' })
  authorId: number;

  @Column({ type: 'int', comment: '回复目标评论 ID，null 表示顶层楼层', nullable: true })
  parentId: number;

  @Column({ type: 'int', comment: '楼层号，顶层评论才有，楼中楼为 null', nullable: true })
  floor: number;

  @Column({ type: 'int', comment: '点赞数', default: 0 })
  likeCount: number;

  @Column({ type: 'timestamp', comment: '评论时间' })
  createdAt: Date;
}
