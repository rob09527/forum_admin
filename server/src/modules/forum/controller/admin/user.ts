import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ForumUserEntity } from '../../entity/user';
import { ForumUserService } from '../../service/user';

/**
 * 论坛用户管理的列表/详情字段白名单。
 * 框架的 page/list 走原生 SQL `SELECT a.*`，会连实体未映射的列一起返回，
 * 所以必须显式 select 白名单，确保 passwordHash/oauthId 永不外泄。
 */
const SAFE_COLUMNS = [
  'a.id',
  'a.username',
  'a.email',
  'a.avatar',
  'a.bio',
  'a.level',
  'a.points',
  'a.stars',
  'a.postCount',
  'a.commentCount',
  'a.role',
  'a.status',
  'a.oauthProvider',
  'a.emailVerified',
  'a.uploadSize',
  'a.totalPointsEarned',
  'a.checkinStreak',
  'a.checkinTotalDays',
  'a.lastCheckinAt',
  'a.createdAt',
  'a.updatedAt',
];

/**
 * 论坛用户管理。
 * 读走 Cool 框架自动生成的 page/list/info；写转发 forum server。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info'],
  entity: ForumUserEntity,
  service: ForumUserService,
  pageQueryOp: {
    select: SAFE_COLUMNS,
    keyWordLikeFields: ['username', 'email'],
    fieldEq: ['role', 'level', 'status'],
    addOrderBy: { createdAt: 'DESC' },
  },
  listQueryOp: {
    select: SAFE_COLUMNS,
    keyWordLikeFields: ['username', 'email'],
    fieldEq: ['role', 'level', 'status'],
    addOrderBy: { createdAt: 'DESC' },
  },
})
export class AdminForumUserController extends BaseController {
  @Inject()
  forumUserService: ForumUserService;

  @Inject()
  ctx: Context;

  @Post('/changeRole', { summary: '修改角色' })
  async changeRole(@Body('id') id: number, @Body('role') role: string) {
    return this.ok(await this.forumUserService.changeRole(id, role));
  }

  @Post('/changeStatus', { summary: '封禁/解封/禁言' })
  async changeStatus(@Body('id') id: number, @Body('status') status: string) {
    return this.ok(await this.forumUserService.changeStatus(id, status));
  }

  @Post('/adjustPoints', { summary: '调整积分' })
  async adjustPoints(@Body('id') id: number, @Body('delta') delta: number) {
    // 从 Cool Admin 登录会话取当前操作者，写入 transfer 流水供审计追责
    const operator = this.ctx.admin?.username as string | undefined;
    return this.ok(await this.forumUserService.adjustPoints(id, delta, operator));
  }

  @Post('/resetPassword', { summary: '重置密码' })
  async resetPassword(@Body('id') id: number, @Body('password') password: string) {
    return this.ok(await this.forumUserService.resetPassword(id, password));
  }
}
