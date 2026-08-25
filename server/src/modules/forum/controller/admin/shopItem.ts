import { CoolController, BaseController } from '@cool-midway/core';
import { Inject, Post, Provide } from '@midwayjs/core';
import { ForumShopItemEntity } from '../../entity/shopItem';
import { ForumShopItemService } from '../../service/shopItem';

/**
 * 装饰商品管理（积分消费体系 2.2，固定货架形态）。
 *
 * 商品改为服务端内置目录：称号 = 图片索引、颜色 = 固定 18 色。
 * 运营只改 权重/价格/时效天数/上下架（update），新增/删除/改名/改渲染值 全部移除。
 * catalog / sync 为自定义接口，走 service 的 getCatalog / syncCatalog（幂等补齐缺失行）。
 */
@Provide()
@CoolController({
  api: ['update'],
  entity: ForumShopItemEntity,
  service: ForumShopItemService,
})
export class AdminForumShopItemController extends BaseController {
  @Inject()
  forumShopItemService: ForumShopItemService;

  /** 读取装饰商品目录（称号 + 颜色，含 DB 现状合并；首次读取自动补种） */
  @Post('/catalog', { summary: '读取装饰商品目录' })
  async catalog() {
    return this.ok(await this.forumShopItemService.getCatalog());
  }

  /** 同步商品目录到数据库（幂等补齐缺失行） */
  @Post('/sync', { summary: '同步商品目录' })
  async sync() {
    return this.ok(await this.forumShopItemService.syncCatalog());
  }
}
