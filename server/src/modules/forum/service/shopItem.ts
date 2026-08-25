import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ForumShopItemEntity } from '../entity/shopItem';
import { TITLE_CATALOG, COLOR_CATALOG, buildAvatarCatalog, isFreePoolAvatar, type TitleIconDef, type ColorDef, type AvatarDef } from '../catalog/shop-catalog';

/** 装饰类型（与 forum 侧 ShopItemType 一致，避免裸字符串） */
const TYPE_TITLE = 'title';
const TYPE_COLOR = 'username_color';
const TYPE_AVATAR = 'avatar';

/** 目录条目与 DB 现状合并后的展示形状（catalog 接口返回给后台） */
interface CatalogEntry {
  id: number | null;
  type: string;
  name: string;
  renderValue: string;
  price: number;
  durationDays: number;
  sortOrder: number;
  isActive: boolean;
  /** 是否已入库（未入库会在首次读取/同步时自动补齐） */
  seeded: boolean;
}

/**
 * 装饰商品目录服务（积分消费体系 2.2 的「固定货架」形态）。
 *
 * 商品不再是运营自由填写的表单，而是服务端内置目录（见 catalog/shop-catalog.ts）：
 * - 称号 = 图片索引（renderValue = key），颜色 = 固定 18 色（renderValue = 色值）；
 * - 运营只改 权重(sortOrder) / 价格(price) / 时效天数(durationDays) / 上下架(isActive)，
 *   不能新增/删除/改名/改渲染值；
 * - 初始化自动填充：首次读取目录或点「同步」时，按 (type, renderValue) 幂等补齐缺失行，
 *   只插不删不改，已存在行保留运营改过的价格/权重/上下架。
 *
 * 读（catalog）与写（update/sync）都直连共享 PG（TypeORM），不转发 forum server；
 * 表结构由 forum server 的 Prisma 迁移创建，本实体仅手抄映射、绝不参与 synchronize。
 */
@Provide()
export class ForumShopItemService extends BaseService {
  @InjectEntityModel(ForumShopItemEntity)
  forumShopItemEntity: Repository<ForumShopItemEntity>;

  @Config('forum.serverUrl')
  forumServerUrl: string;

  /** 读取目录 + DB 现状合并（后台商品管理页唯一数据源）。首次打开自动补种缺失行。 */
  async getCatalog(): Promise<{ titles: CatalogEntry[]; colors: CatalogEntry[]; avatars: CatalogEntry[] }> {
    await this.ensureSeed();

    const rows = await this.forumShopItemEntity.find({
      select: ['id', 'type', 'name', 'renderValue', 'price', 'durationDays', 'sortOrder', 'isActive'],
    });
    const byKey = new Map<string, ForumShopItemEntity>();
    for (const r of rows) byKey.set(`${r.type}|${r.renderValue}`, r);

    const titles = TITLE_CATALOG.map((def) => this.mergeEntry(def, def.key, TYPE_TITLE, byKey.get(`${TYPE_TITLE}|${def.key}`)));
    const colors = COLOR_CATALOG.map((def) => this.mergeEntry(def, def.value, TYPE_COLOR, byKey.get(`${TYPE_COLOR}|${def.value}`)));
    const avatars = (await this.avatarCatalog()).map((def) => this.mergeEntry(def, def.renderValue, TYPE_AVATAR, byKey.get(`${TYPE_AVATAR}|${def.renderValue}`)));
    return { titles, colors, avatars };
  }

  /** 同步（幂等补齐缺失行），返回本次新增数量。手动「同步商品」按钮复用。 */
  async syncCatalog(): Promise<{ created: number }> {
    return { created: await this.ensureSeed() };
  }

  /**
   * 编辑商品：只允许改 权重 / 价格 / 时效天数 / 上下架。
   * 名称、渲染值、类型一律从既有行取，不接收表单值 —— 运营无法改目录语义。
   * 时效天数允许运营配置（> 0 天），不接收 0 或负值。
   */
  async update(param: any): Promise<void> {
    const id = Number(param?.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new CoolCommException('缺少商品 ID');
    }
    const existing = await this.forumShopItemEntity.findOneBy({ id });
    if (!existing) {
      throw new CoolCommException('商品不存在');
    }

    // 价格允许 0（免费头像）；sortOrder 允许 0（置顶排序）；时效天数必须 ≥1。
    // 免费池头像（价格 0）不允许收费：无论提交什么价格都强制 0。
    const isFreePool = existing.type === TYPE_AVATAR && isFreePoolAvatar(existing.renderValue);
    const price = isFreePool ? 0 : (param?.price != null ? this.nonNegativeInt(param.price, '价格') : existing.price);
    const sortOrder = param?.sortOrder != null ? this.nonNegativeInt(param.sortOrder, '权重') : existing.sortOrder;
    const durationDays = param?.durationDays != null ? this.positiveInt(param.durationDays, '时效天数') : existing.durationDays;
    const isActive = param?.isActive != null ? Boolean(param.isActive) : existing.isActive;

    await this.forumShopItemEntity.update(id, {
      price,
      sortOrder,
      durationDays,
      isActive,
      updatedAt: new Date(),
    });
  }

  /**
   * 幂等种子：补齐目录中缺失的商品行（只插不删不改）。
   * 命中已存在行（type + renderValue 相同）则跳过，运营改过的价格/权重/上下架不受影响。
   * @returns 本次新增行数
   */
  private async ensureSeed(): Promise<number> {
    const existing = await this.forumShopItemEntity.find({ select: ['type', 'renderValue'] });
    const existingKeys = new Set(existing.map((r) => `${r.type}|${r.renderValue}`));

    const now = new Date();
    const toInsert: ForumShopItemEntity[] = [];
    const push = (type: string, name: string, renderValue: string, price: number, durationDays: number, sortOrder: number) => {
      if (existingKeys.has(`${type}|${renderValue}`)) return;
      toInsert.push(
        this.forumShopItemEntity.create({
          type,
          name,
          renderValue,
          renderStyle: null,
          price,
          durationDays,
          sortOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    };

    for (const def of TITLE_CATALOG) push(TYPE_TITLE, def.name, def.key, def.price, def.durationDays, def.sortOrder);
    for (const def of COLOR_CATALOG) push(TYPE_COLOR, def.name, def.value, def.price, def.durationDays, def.sortOrder);
    for (const def of await this.avatarCatalog()) push(TYPE_AVATAR, def.name, def.renderValue, def.price, def.durationDays, def.sortOrder);

    if (toInsert.length > 0) {
      await this.forumShopItemEntity.save(toInsert);
    }
    return toInsert.length;
  }

  /**
   * 运行时拉取权威头像风格清单（forum server /api/avatar-styles 公开接口，单一来源）。
   * 不在此手抄风格列表，消除 admin 与 server 的双份复制漂移；forum 不可达时抛错（seed 依赖其在线）。
   */
  private async avatarCatalog(): Promise<AvatarDef[]> {
    try {
      const { data } = await axios.get(`${this.forumServerUrl}/api/avatar-styles`, { timeout: 5000 });
      const styles = data?.data?.styles;
      const perStyle = data?.data?.perStyle;
      if (!Array.isArray(styles) || styles.length === 0 || !Number.isInteger(perStyle) || perStyle < 1) {
        throw new CoolCommException('forum 返回的头像风格清单结构非法');
      }
      return buildAvatarCatalog(styles, perStyle);
    } catch (err) {
      if (err instanceof CoolCommException) throw err;
      const message = err?.response?.data?.error?.message || err?.message;
      throw new CoolCommException(`拉取头像风格失败（forum server 不可达？）：${message}`);
    }
  }

  /** 目录定义 + DB 现状合并成一条展示项 */
  private mergeEntry(
    def: TitleIconDef | ColorDef | AvatarDef,
    renderValue: string,
    type: string,
    row?: ForumShopItemEntity,
  ): CatalogEntry {
    return {
      id: row?.id ?? null,
      type,
      name: def.name,
      renderValue,
      price: row?.price ?? def.price,
      durationDays: row?.durationDays ?? def.durationDays,
      sortOrder: row?.sortOrder ?? def.sortOrder,
      isActive: row?.isActive ?? true,
      seeded: !!row,
    };
  }

  private positiveInt(v: unknown, label: string): number {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      throw new CoolCommException(`${label}必须是不小于 1 的整数`);
    }
    return n;
  }

  private nonNegativeInt(v: unknown, label: string): number {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) {
      throw new CoolCommException(`${label}必须是不小于 0 的整数`);
    }
    return n;
  }
}
