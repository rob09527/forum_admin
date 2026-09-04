import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ForumBountyEntity } from '../../entity/bounty';
import { ForumUserEntity } from '../../entity/user';
import { ForumBountyService } from '../../service/bounty';

/**
 * 悬赏管理（积分消费体系 2.4）。
 * 列表只读（状态筛选 + 发起人/被采纳者用户名）；
 * 人工退款 / 立即结算转发 forum server（账务写唯一入口）。
 *
 * 不开放 `list`：框架的 list() 不加任何 LIMIT，bounties 是随业务线性增长的大表，
 * 一次全量返回会打挂单进程的 Midway。前端 view 走 page + cl-pagination，不依赖 list。
 */
@Provide()
@CoolController({
  api: ['page', 'info'],
  entity: ForumBountyEntity,
  service: ForumBountyService,
  pageQueryOp: {
    select: [
      'a.id',
      'a.postId',
      'a.userId',
      'a.amount',
      'a.status',
      'a.expireAt',
      'a.acceptedCommentId',
      'a.acceptedUserId',
      'a.payout',
      'a.fee',
      'a.settleType',
      'a.settledAt',
      'a.operator',
      'a.createdAt',
      'b.username as "userName"',
      'c.username as "acceptedUserName"',
    ],
    fieldEq: ['a.status', 'a.userId'],
    // 状态 + 时间范围过滤
    where: (ctx: any) => {
      const { startCreatedAt, endCreatedAt } = ctx?.request?.body || {};
      const wheres: [string, object][] = [];
      if (startCreatedAt) {
        wheres.push(['a."createdAt" >= :startCreatedAt::timestamp', { startCreatedAt }]);
      }
      if (endCreatedAt) {
        wheres.push(['a."createdAt" <= :endCreatedAt::timestamp', { endCreatedAt }]);
      }
      return wheres;
    },
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
      {
        entity: ForumUserEntity,
        alias: 'c',
        condition: 'a.acceptedUserId = c.id',
      },
    ],
    addOrderBy: { createdAt: 'DESC' },
  },
})
export class AdminForumBountyController extends BaseController {
  /** 当前请求上下文（Midway 自动注入），取操作者用户名写 Bounty.operator 审计 */
  ctx: Context;

  @Inject()
  forumBountyService: ForumBountyService;

  /**
   * 人工退款（处置异常悬赏）。
   * operator 为当前操作的管理员用户名，forum 侧写入 Bounty.operator 审计追责。
   */
  @Post('/refund', { summary: '悬赏人工退款' })
  async refund(@Body('id') id: number) {
    const operator = this.ctx.admin?.username as string | undefined;
    return this.ok(await this.forumBountyService.refund(id, operator));
  }

  /** 立即结算所有到期悬赏（人工兜底，调度器异常时的补充） */
  @Post('/sweep', { summary: '立即结算到期悬赏' })
  async sweep() {
    return this.ok(await this.forumBountyService.sweep());
  }
}
