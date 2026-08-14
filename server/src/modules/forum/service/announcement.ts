import { BaseService, CoolCommException } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ForumAnnouncementEntity } from '../entity/announcement';
import { normalizeLink } from './url';

/** 公告类型白名单（与 forum server 的 AnnouncementType 对齐） */
const ANNOUNCEMENT_TYPES = ['normal', 'important', 'urgent', 'activity'];

/**
 * 论坛公告服务。
 * 公告是「单行字典写、无级联/无缓存」，直接连 PG（TypeORM）即可，不转发 forum server。
 * 读（page/list/info）继承 BaseService；
 * 写（add/update）重写：框架默认 addOrUpdate 会注入 createTime/updateTime，
 * 而本实体继承 CoolBaseEntity（只有 createdAt/updatedAt），会撞上不存在的列，故显式填 createdAt/updatedAt。
 * 删除无级联约束，直接继承 BaseService.delete。
 */
@Provide()
export class ForumAnnouncementService extends BaseService {
  @InjectEntityModel(ForumAnnouncementEntity)
  forumAnnouncementEntity: Repository<ForumAnnouncementEntity>;

  /** 新增公告（标题必填） */
  async add(param: any) {
    const title = this.assertTitle(param?.title);
    const saved = await this.forumAnnouncementEntity.save({
      title,
      type: this.normalizeType(param.type),
      link: normalizeLink(param.link),
      sortOrder: param.sortOrder ?? 0,
      isActive: param.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: saved.id };
  }

  /** 编辑公告（仅更新传入字段，未传字段保持原值） */
  async update(param: any): Promise<void> {
    const existing = await this.forumAnnouncementEntity.findOneBy({ id: param?.id });
    if (!existing) {
      throw new CoolCommException('公告不存在');
    }
    await this.forumAnnouncementEntity.update(param.id, {
      title: param.title !== undefined ? this.assertTitle(param.title) : existing.title,
      type: param.type !== undefined ? this.normalizeType(param.type) : existing.type,
      link: param.link !== undefined ? normalizeLink(param.link) : existing.link,
      sortOrder: param.sortOrder ?? existing.sortOrder,
      isActive: param.isActive ?? existing.isActive,
      updatedAt: new Date(),
    });
  }

  /** 标题必填且不超过 200 字 */
  private assertTitle(title: any): string {
    const t = (title ?? '').trim();
    if (!t || t.length > 200) {
      throw new CoolCommException('公告标题必填且不超过 200 字');
    }
    return t;
  }

  /** 类型收敛到白名单，非法值回退 normal */
  private normalizeType(type: any): string {
    return ANNOUNCEMENT_TYPES.includes(type) ? type : 'normal';
  }
}
