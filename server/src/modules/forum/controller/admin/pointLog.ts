import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumPointLogEntity } from '../../entity/pointLog';
import { ForumUserEntity } from '../../entity/user';

/**
 * 论坛积分流水的列表字段。
 * 通过 LEFT JOIN users 取用户名 b.username as "userName"。
 * 注意：别名必须加引号，否则 PostgreSQL 会把未加引号的别名折叠成小写（userName → username），
 * 前端 prop 匹配不上导致列为空。
 */
const LIST_COLUMNS = [
  'a.id',
  'a.userId',
  'a.type',
  'a.delta',
  'a.balanceAfter',
  'a.refId',
  'a.operator',
  'a.createdAt',
  'b.username as "userName"',
];

/**
 * 时间范围过滤（前端 cl-search 的 datetimeRange hook 会把
 * createdAt 拆成 startCreatedAt / endCreatedAt 两个请求参数）。
 * 原生 where 钩子返回 [条件, 参数] 数组，框架会自动绑定参数。
 */
const timeRangeWhere = (ctx: any) => {
  const { startCreatedAt, endCreatedAt } = ctx?.request?.body || {};
  const wheres: [string, object][] = [];
  if (startCreatedAt) {
    // 前端传的是字符串，PostgreSQL 不允许 timestamp 列直接跟 text 参数比较，必须显式 ::timestamp 强转
    wheres.push(['a."createdAt" >= :startCreatedAt::timestamp', { startCreatedAt }]);
  }
  if (endCreatedAt) {
    wheres.push(['a."createdAt" <= :endCreatedAt::timestamp', { endCreatedAt }]);
  }
  return wheres;
};

/**
 * 论坛积分明细（只读）。
 * 纯读直连 PG，无自定义写操作，故无需自定义 service，框架用 BaseService 生成 page/list/info。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info'],
  entity: ForumPointLogEntity,
  pageQueryOp: {
    select: LIST_COLUMNS,
    keyWordLikeFields: ['b.username'],
    fieldEq: ['id', 'type'],
    where: timeRangeWhere,
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
    addOrderBy: { createdAt: 'DESC' },
  },
  listQueryOp: {
    select: LIST_COLUMNS,
    keyWordLikeFields: ['b.username'],
    fieldEq: ['id', 'type'],
    where: timeRangeWhere,
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
    addOrderBy: { createdAt: 'DESC' },
  },
})
export class AdminForumPointLogController extends BaseController {}
