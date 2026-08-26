import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { BaseSysMenuEntity } from '../modules/base/entity/sys/menu';

/**
 * forum 菜单同步脚本（幂等 upsert）。
 *
 * 背景：Cool Admin 的 initMenu 以 base_sys_conf 的 init_db_<module> 标记判断模块是否已初始化，
 * 已初始化过的模块再次启动不会重新导入 menu.json →「新增/修改菜单在部署后不生效」。
 * 本脚本独立于 initMenu，按 (parentId, name) 幂等 upsert forum 菜单树，每次部署显式执行，
 * 让 menu.json 成为 forum 菜单的唯一事实来源（配置管理页 / 权限菜单均以它为基准）。
 *
 * 用法：compose run --rm -T --no-deps admin-server node dist/scripts/sync-forum-menu.js
 * 依赖环境变量 DATABASE_URL（docker-compose 已注入）；menu.json 随编译产物落在
 * dist/modules/forum/menu.json。
 *
 * 仅 upsert、不删除：后台手工新增/改名过的菜单不会被误删；
 * 若某菜单需从 menu.json 移除，可在后台「系统管理→菜单管理」手动删除。
 *
 * 注意：改 menu.json 的 icon 前，先确保图标名对应 client 侧
 * src/modules/base/static/svg/ 里存在的 icon-*.svg（去掉 .svg 后缀）。
 * 写错图标名不会报错、只在菜单上不显示；本地可跑 scripts/check-menu-icons.mjs 校验（CI 已接入）。
 */
interface MenuNode {
  name: string;
  router?: string | null;
  perms?: string | null;
  type?: number;
  icon?: string | null;
  orderNum?: number;
  viewPath?: string | null;
  keepAlive?: boolean;
  isShow?: boolean;
  childMenus?: MenuNode[];
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 未设置（compose 环境应已注入）');
  }

  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [BaseSysMenuEntity],
    synchronize: false,
  });
  await ds.initialize();

  const repo = ds.getRepository(BaseSysMenuEntity);
  const menuJsonPath = path.join(__dirname, '..', 'modules', 'forum', 'menu.json');
  const menus: MenuNode[] = JSON.parse(fs.readFileSync(menuJsonPath, 'utf8'));

  /** 递归 upsert：按 (parentId, name) 定位既有行，存在则更新业务字段，不存在则插入 */
  const upsert = async (node: MenuNode, parentId: number | null): Promise<number> => {
    const { childMenus, ...data } = node;
    const fields = { ...data, parentId };

    let id: number;
    const existing = await repo.findOne({ where: { name: node.name, parentId } });
    if (existing) {
      // 仅更新业务字段（fields 不含 id，parentId 是匹配键不改），保留 id / createTime
      const { parentId: _pid, ...patch } = fields;
      await repo.update(existing.id, { ...patch, updateTime: new Date() });
      id = existing.id;
    } else {
      // repo.create 先把纯对象变成实体（返回类型带 id），save 后再取 id
      const saved = await repo.save(
        repo.create({ ...fields, createTime: new Date(), updateTime: new Date() })
      );
      id = saved.id;
    }

    for (const child of childMenus ?? []) {
      await upsert(child, id);
    }
    return id;
  };

  for (const menu of menus) {
    await upsert(menu, null);
  }

  console.log(`[menu-sync] forum 菜单同步完成（${menus.length} 个顶级菜单，幂等 upsert）`);
  await ds.destroy();
}

// 仅在被直接执行时（node dist/scripts/sync-forum-menu.js）运行；被 Midway 目录扫描 require 时
// （如本地 npm run dev）不触发，否则无 DATABASE_URL 会在启动阶段抛错导致整个后端崩溃。
if (require.main === module) {
  main().catch((err) => {
    console.error('[menu-sync] 同步失败:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
