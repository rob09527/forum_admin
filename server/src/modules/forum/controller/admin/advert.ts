import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumAdvertEntity } from '../../entity/advert';
import { ForumAdvertService } from '../../service/advert';

/**
 * 论坛广告管理。
 * 完整 CRUD（page/list/info/add/update/delete）走自定义 service：
 * 写带图片/位置校验 + createdAt/updatedAt 正确填充（框架默认注入的是 createTime/updateTime）。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info', 'add', 'update', 'delete'],
  entity: ForumAdvertEntity,
  service: ForumAdvertService,
  pageQueryOp: {
    keyWordLikeFields: ['a.title'],
    fieldEq: ['position'],
    addOrderBy: { sortOrder: 'DESC', createdAt: 'DESC' },
  },
  listQueryOp: {
    keyWordLikeFields: ['a.title'],
    fieldEq: ['position'],
    addOrderBy: { sortOrder: 'DESC', createdAt: 'DESC' },
  },
})
export class AdminForumAdvertController extends BaseController {}
