import { BaseService, CoolCommException } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ForumCategoryEntity } from '../entity/category';

/**
 * 论坛分类服务。
 * 分类是「单行字典写、无级联/无缓存」，直接连 PG（TypeORM）即可，不转发 forum server。
 * 读（page/list/info）继承 BaseService，叠加每个分类的真实帖子数 postCount；
 * 写（add/update/delete）重写：加 slug 判重/不可改、删除守卫（有帖子禁止删）。
 *
 * 注意：不能直接用框架默认的 add/update——它们的 addOrUpdate 会注入 createTime/updateTime，
 * 而本实体继承 CoolBaseEntity（只有 createdAt/updatedAt），会撞上不存在的列。
 */
@Provide()
export class ForumCategoryService extends BaseService {
  @InjectEntityModel(ForumCategoryEntity)
  forumCategoryEntity: Repository<ForumCategoryEntity>;

  /** 新增分类（slug 必填、判重） */
  async add(param: any) {
    const slug = param?.slug;
    this.assertSlug(slug);

    const exists = await this.forumCategoryEntity.findOneBy({ slug });
    if (exists) {
      throw new CoolCommException('slug 已存在');
    }

    const now = new Date();
    const saved = await this.forumCategoryEntity.save({
      slug,
      name: param.name,
      icon: param.icon ?? '📂',
      sortOrder: param.sortOrder ?? 0,
      isEnabled: param.isEnabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return { id: saved.id };
  }

  /** 编辑分类（slug 不可改；支持只传 isEnabled 做开关切换） */
  async update(param: any): Promise<void> {
    const existing = await this.forumCategoryEntity.findOneBy({ id: param?.id });
    if (!existing) {
      throw new CoolCommException('分类不存在');
    }
    if (param.slug !== undefined && param.slug !== existing.slug) {
      throw new CoolCommException('slug 不可修改，请删除后重建');
    }

    await this.forumCategoryEntity.update(param.id, {
      name: param.name ?? existing.name,
      icon: param.icon ?? existing.icon,
      sortOrder: param.sortOrder ?? existing.sortOrder,
      isEnabled: param.isEnabled ?? existing.isEnabled,
      updatedAt: new Date(),
    });
  }

  /** 删除分类（有帖子的分类禁止删除） */
  async delete(ids: any): Promise<void> {
    const idArr = this.normalizeIds(ids);
    for (const id of idArr) {
      const cat = await this.forumCategoryEntity.findOneBy({ id });
      if (!cat) continue;
      const [row] = await this.forumCategoryEntity.manager.query(
        `SELECT count(*) AS c FROM posts WHERE category = $1`,
        [cat.slug],
      );
      if (Number(row.c) > 0) {
        throw new CoolCommException(`分类「${cat.name}」下有 ${row.c} 个帖子，无法删除`);
      }
    }
    await this.forumCategoryEntity.delete(idArr);
  }

  /** 分页列表：叠加 postCount（一次 GROUP BY，避免 N+1） */
  async page(query: any, option?: any, connectionName?: string) {
    const res = await super.page(query, option, connectionName);
    await this.attachPostCounts(res?.list ?? []);
    return res;
  }

  /** 非分页列表：同上 */
  async list(query: any, option?: any, connectionName?: string) {
    const res = await super.list(query, option, connectionName);
    await this.attachPostCounts(Array.isArray(res) ? res : res?.list ?? []);
    return res;
  }

  private async attachPostCounts(rows: any[]) {
    if (!rows?.length) return;
    const counts = await this.forumCategoryEntity.manager.query(
      `SELECT category, count(*) AS c FROM posts GROUP BY category`,
    );
    const map = new Map(counts.map((r) => [r.category, Number(r.c)]));
    for (const row of rows) {
      row.postCount = map.get(row.slug) ?? 0;
    }
  }

  private assertSlug(slug: string) {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new CoolCommException('slug 只能包含小写字母、数字、连字符');
    }
  }

  private normalizeIds(ids: any): number[] {
    if (ids == null) return [];
    if (Array.isArray(ids)) return ids.map(Number);
    return String(ids).split(',').filter(Boolean).map(Number);
  }
}
