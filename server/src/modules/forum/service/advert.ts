import { BaseService, CoolCommException } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ForumAdvertEntity } from '../entity/advert';
import { normalizeLink, assertHttpUrl } from './url';

/** 广告位置白名单（与 forum server 的 AdvertPosition 对齐；top 已下线） */
const ADVERT_POSITIONS = ['sidebar', 'inline'];

/**
 * 论坛广告服务。
 * 广告是「单行字典写、无级联/无缓存」，直接连 PG（TypeORM）即可，不转发 forum server。
 * 读（page/list/info）继承 BaseService；
 * 写（add/update）重写：框架默认 addOrUpdate 会注入 createTime/updateTime，
 * 而本实体继承 CoolBaseEntity（只有 createdAt/updatedAt），会撞上不存在的列，故显式填 createdAt/updatedAt。
 * 删除无级联约束，直接继承 BaseService.delete。
 */
@Provide()
export class ForumAdvertService extends BaseService {
  @InjectEntityModel(ForumAdvertEntity)
  forumAdvertEntity: Repository<ForumAdvertEntity>;

  /** 新增广告（图片必填） */
  async add(param: any) {
    const saved = await this.forumAdvertEntity.save({
      title: this.normalizeTitle(param.title),
      image: assertHttpUrl(param.image, 'banner 图片'),
      position: this.normalizePosition(param.position),
      link: normalizeLink(param.link),
      sortOrder: param.sortOrder ?? 0,
      isActive: param.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: saved.id };
  }

  /** 编辑广告（仅更新传入字段，未传字段保持原值） */
  async update(param: any): Promise<void> {
    const existing = await this.forumAdvertEntity.findOneBy({ id: param?.id });
    if (!existing) {
      throw new CoolCommException('广告不存在');
    }
    await this.forumAdvertEntity.update(param.id, {
      title: param.title !== undefined ? this.normalizeTitle(param.title) : existing.title,
      image: param.image !== undefined ? assertHttpUrl(param.image, 'banner 图片') : existing.image,
      position: param.position !== undefined ? this.normalizePosition(param.position) : existing.position,
      link: param.link !== undefined ? normalizeLink(param.link) : existing.link,
      sortOrder: param.sortOrder ?? existing.sortOrder,
      isActive: param.isActive ?? existing.isActive,
      updatedAt: new Date(),
    });
  }

  /** 标题去空白，空串归一为 null（可空） */
  private normalizeTitle(title: any): string | null {
    if (title == null) return null;
    const s = String(title).trim();
    return s === '' ? null : s;
  }

  /** 位置收敛到白名单，非法值回退 sidebar */
  private normalizePosition(position: any): string {
    return ADVERT_POSITIONS.includes(position) ? position : 'sidebar';
  }
}
