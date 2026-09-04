import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ForumUserEntity } from '../../entity/user';
import { ForumUserService } from '../../service/user';

/**
 * 论坛用户管理的列表/详情字段白名单。
 * 框架的 page 走原生 SQL `SELECT a.*`，会连实体未映射的列一起返回，
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
  // 冗余计数列，前端「关注 / 粉丝」两列依赖，此前漏列导致两列永远为空
  'a.followerCount',
  'a.followingCount',
  'a.role',
  'a.status',
  // 来源标记：导入的影子用户 vs 真人注册，前端「来源」列与筛选依赖
  'a.isShadow',
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
 * 来源筛选（真人注册 / 导入影子用户）。
 *
 * 刻意不用框架的 `fieldEq`：它的取值判断是 `if (query[key] || query[key] == 0)`，
 * 而 `'' == 0` 在 JS 里为 true —— 前端清空下拉传空串时会把 `''` 当有效值绑进 SQL，
 * boolean 列拿到 `''` 会直接 PG 报错。这里显式只认 true/false 两种取值。
 *
 * 请求参数 `isShadow`：布尔或 'true'/'false' 字符串；其余（含空串/未传）视为「全部」不加条件。
 */
const shadowWhere = (ctx: any) => {
  const raw = ctx?.request?.body?.isShadow;
  const wheres: [string, object][] = [];
  if (raw === true || raw === 'true') {
    wheres.push(['a."isShadow" = true', {}]);
  } else if (raw === false || raw === 'false') {
    wheres.push(['a."isShadow" = false', {}]);
  }
  return wheres;
};

/**
 * 论坛用户管理。
 * 读走 Cool 框架自动生成的 page/info；写转发 forum server。
 *
 * 不开放 `list`：框架的 list() 不加任何 LIMIT，users 是随业务线性增长的大表，
 * 一次全量返回会打挂单进程的 Midway。前端 view 走 page + cl-pagination，不依赖 list。
 */
@Provide()
@CoolController({
  api: ['page', 'info'],
  entity: ForumUserEntity,
  service: ForumUserService,
  pageQueryOp: {
    select: SAFE_COLUMNS,
    keyWordLikeFields: ['username', 'email'],
    fieldEq: ['role', 'level', 'status'],
    where: shadowWhere,
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
