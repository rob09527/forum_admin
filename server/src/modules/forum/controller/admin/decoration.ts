import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumUserDecorationEntity } from '../../entity/userDecoration';
import { ForumUserEntity } from '../../entity/user';

/**
 * 用户装饰持有记录查询（积分消费体系 2.3，只读）。
 * 用于客诉排查（「我的颜色没了」「我没买过这个」）：按用户 / 商品 / 是否过期筛选。
 * 纯读直连 PG，无自定义写操作，框架用 BaseService 生成 page/info。
 *
 * 不开放 `list`：框架的 list() 不加任何 LIMIT，user_decorations 是随业务线性增长的大表，
 * 一次全量返回会打挂单进程的 Midway。前端 view 走 page + cl-pagination，不依赖 list。
 */
@Provide()
@CoolController({
  api: ['page', 'info'],
  entity: ForumUserDecorationEntity,
  pageQueryOp: {
    select: [
      'a.id',
      'a.userId',
      'a.itemId',
      'a.type',
      'a.renderValue',
      'a.renderStyle',
      'a.price',
      'a.startAt',
      'a.expireAt',
      'a.expiredNotifiedAt',
      'a.createdAt',
      'b.username as "userName"',
    ],
    keyWordLikeFields: ['b.username', 'a.renderValue'],
    fieldEq: ['a.userId', 'a.itemId', 'a.type'],
    // 是否过期：过期 = 已到期（expireAt < now）；未过期 = 未到期。null/空 = 不过滤
    where: (ctx: any) => {
      const { overdue } = ctx?.request?.body || {};
      if (overdue === '1') return [['a."expireAt" < :now::timestamp', { now: new Date() }]];
      if (overdue === '0') return [['a."expireAt" >= :now::timestamp', { now: new Date() }]];
      return [];
    },
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
    addOrderBy: { expireAt: 'DESC' },
  },
})
export class AdminForumDecorationController extends BaseController {}
