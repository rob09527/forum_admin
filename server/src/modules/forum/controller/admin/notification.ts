import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { ForumNotificationEntity } from '../../entity/notification';
import { ForumUserEntity } from '../../entity/user';
import { ForumNotificationService } from '../../service/notification';

/**
 * 论坛通知管理。
 * 列表只读（展示发送记录 + 已读状态，LEFT JOIN users 取接收者用户名）；
 * 群发系统通知走自定义接口转发 forum server。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info', 'delete'],
  entity: ForumNotificationEntity,
  service: ForumNotificationService,
  pageQueryOp: {
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
  listQueryOp: {
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
