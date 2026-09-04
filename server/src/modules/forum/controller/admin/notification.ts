import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { ForumNotificationEntity } from '../../entity/notification';
import { ForumUserEntity } from '../../entity/user';
import { ForumNotificationService } from '../../service/notification';

/**
 * 论坛通知的列表字段白名单。
 *
 * 必须显式声明，不能依赖框架默认的 `SELECT a.*, b.*`，原因有两条（都实测过）：
 * 1. 泄露：`b.*` 会把 users 表的 passwordHash / oauthId 一并返回给前端；
 * 2. 串号：`a.*` 与 `b.*` 的同名列（id、createdAt）在结果集里重复出现，
 *    node-postgres 把行映射成对象时后者覆盖前者 → 列表里的「通知 ID / 时间」
 *    实际是用户的 id 和注册时间。本控制器开了 delete，前端按 row.id 删除，
 *    等于按用户 id 去删通知，会误删无关通知。
 *
 * 用户名走别名 `b.username as "userName"`，与 a 的列不同名，规避碰撞。
 * 别名必须加双引号，否则 PostgreSQL 会把它折叠成小写（userName → username），前端 prop 匹配不上。
 */
const LIST_COLUMNS = [
  'a.id',
  'a.userId',
  'a.type',
  'a.actorIds',
  'a.actorCount',
  'a.postId',
  'a.commentId',
  'a.messageId',
  'a.content',
  'a.isRead',
  'a.createdAt',
  'b.username as "userName"',
];

/**
 * 论坛通知管理。
 * 列表只读（展示发送记录 + 已读状态，LEFT JOIN users 取接收者用户名）；
 * 群发系统通知走自定义接口转发 forum server。
 *
 * 不开放 `list`：框架的 list() 不加 LIMIT，notifications 是随评论/点赞线性增长的大表
 * （导入完成后量级与 comments 同阶），一次全量返回会打挂单进程的 Midway。
 * 前端 view 走 page + cl-pagination，不依赖 list。
 */
@Provide()
@CoolController({
  api: ['page', 'info', 'delete'],
  entity: ForumNotificationEntity,
  service: ForumNotificationService,
  pageQueryOp: {
    select: LIST_COLUMNS,
    keyWordLikeFields: ['b.username'],
    fieldEq: ['type'],
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
export class AdminForumNotificationController extends BaseController {
  @Inject()
  forumNotificationService: ForumNotificationService;

  @Post('/broadcast', { summary: '群发系统通知' })
  async broadcast(@Body() body: any) {
    return this.ok(await this.forumNotificationService.broadcast(body));
  }
}
