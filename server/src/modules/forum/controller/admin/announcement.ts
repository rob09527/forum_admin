import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumAnnouncementEntity } from '../../entity/announcement';
import { ForumAnnouncementService } from '../../service/announcement';

/**
 * 论坛公告管理。
 * 完整 CRUD（page/list/info/add/update/delete）走自定义 service：
 * 写带标题校验 + createdAt/updatedAt 正确填充（框架默认注入的是 createTime/updateTime）。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info', 'add', 'update', 'delete'],
  entity: ForumAnnouncementEntity,
  service: ForumAnnouncementService,
  pageQueryOp: {
    keyWordLikeFields: ['a.title'],
    addOrderBy: { sortOrder: 'DESC', createdAt: 'DESC' },
  },
  listQueryOp: {
    keyWordLikeFields: ['a.title'],
    addOrderBy: { sortOrder: 'DESC', createdAt: 'DESC' },
  },
})
export class AdminForumAnnouncementController extends BaseController {}
