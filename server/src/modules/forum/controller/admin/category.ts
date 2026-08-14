import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumCategoryEntity } from '../../entity/category';
import { ForumCategoryService } from '../../service/category';

/**
 * 论坛分类管理。
 * 完整 CRUD（page/list/info/add/update/delete）走自定义 service：
 * 读叠加 postCount，写带 slug 判重/不可改 + 删除守卫。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info', 'add', 'update', 'delete'],
  entity: ForumCategoryEntity,
  service: ForumCategoryService,
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.slug'],
    addOrderBy: { sortOrder: 'ASC' },
  },
  listQueryOp: {
    keyWordLikeFields: ['a.name', 'a.slug'],
    addOrderBy: { sortOrder: 'ASC' },
  },
})
export class AdminForumCategoryController extends BaseController {}
