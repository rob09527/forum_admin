import { CoolBaseEntity } from '@cool-midway/core';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 论坛用户（映射 Prisma 管理的 users 表，只读）。
 *
 * 关键约束：
 * - 不继承 BaseEntity（它带 createTime/updateTime/tenantId，users 表没有这些列）；
 *   直接继承 CoolBaseEntity 空基类，自行定义 id/createdAt/updatedAt。
 * - 敏感字段 passwordHash、oauthId 刻意不映射，杜绝任何接口泄漏。
 */
@Entity('users')
export class ForumUserEntity extends CoolBaseEntity {
  @PrimaryGeneratedColumn('increment', { comment: '用户 ID' })
  id: number;

  @Index({ unique: true })
  @Column({ type: 'text', comment: '用户名' })
  username: string;

  @Index({ unique: true })
  @Column({ type: 'text', comment: '邮箱', nullable: true })
  email: string;

  @Column({ type: 'text', comment: '头像 URL', nullable: true })
  avatar: string;

  @Column({ type: 'text', comment: '个人简介', nullable: true })
  bio: string;

  @Column({ type: 'text', comment: '等级 claw/leg/meat', default: 'claw' })
  level: string;

  @Column({ type: 'int', comment: '鸡腿积分', default: 0 })
  points: number;

  @Column({ type: 'int', comment: '星辰', default: 0 })
  stars: number;

  @Column({ type: 'int', comment: '发帖数', default: 0 })
  postCount: number;

  @Column({ type: 'int', comment: '评论数', default: 0 })
  commentCount: number;

  @Column({ type: 'text', comment: '角色 user/mod/admin', default: 'user' })
  role: string;

  @Column({ type: 'text', comment: '状态 active/banned/muted', default: 'active' })
  status: string;

  @Column({ type: 'text', comment: '第三方登录来源', nullable: true })
  oauthProvider: string;

  @Column({ type: 'boolean', comment: '邮箱是否已验证', default: false })
  emailVerified: boolean;

  @Column({ type: 'int', comment: '累计上传字节数', default: 0 })
  uploadSize: number;

  @Column({ type: 'int', comment: '累计鸡腿（只增不减）', default: 0 })
  totalPointsEarned: number;

  @Column({ type: 'int', comment: '连续签到天数', default: 0 })
  checkinStreak: number;

  @Column({ type: 'int', comment: '累计签到天数', default: 0 })
  checkinTotalDays: number;

  @Column({ type: 'timestamp', comment: '上次签到时间', nullable: true })
  lastCheckinAt: Date;

  @Column({ type: 'timestamp', comment: '注册时间' })
  createdAt: Date;

  @Column({ type: 'timestamp', comment: '最后更新时间' })
  updatedAt: Date;
}
