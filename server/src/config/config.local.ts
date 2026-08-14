import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import { TenantSubscriber } from '../modules/base/db/tenant';

/**
 * 本地开发 npm run dev 读取的配置文件。
 * 优先读 DATABASE_URL 环境变量（与 forum server 命名一致）；未设置时回退到本机默认连接。
 */
// 本机默认连接（仅开发兜底），设置了 DATABASE_URL 则用完整连接串
const localDb =
  process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : { host: '127.0.0.1', port: 5432, username: 'rob', password: '', database: 'forum' };

export default {
  typeorm: {
    dataSource: {
      default: {
        type: 'postgres',
        ...localDb,
        // 本地必须 true：Cool Admin 首次启动靠 synchronize 自动建基表（base_sys_* 等），
        // 并从各模块 db.json 导入默认数据（admin/123456、角色、字典等）+ initMenu 生成菜单树。
        // 论坛业务表已由 forum 实体 @Entity({ synchronize: false }) 排除同步（见 modules/forum/entity/*）——
        // 否则 TypeORM 会 DROP「库中存在但 entity 未映射」的列（如 users.passwordHash / oauthId）。
        // 生产（config.prod.ts）仍为 false + initDB:false，基表须在首次本地模式初始化时建好。
        synchronize: true,
        // 打印日志
        logging: false,
        // 是否开启缓存
        cache: true,
        // 实体路径
        entities: ['**/modules/*/entity'],
        // 订阅者
        subscribers: [TenantSubscriber],
      },
    },
  },
  cool: {
    // 实体与路径，跟生成代码、前端请求、swagger文档相关 注意：线上不建议开启，以免暴露敏感信息
    eps: true,
    // 是否自动导入模块数据库
    initDB: true,
    // 判断是否初始化的方式
    initJudge: 'db',
    // 是否自动导入模块菜单
    initMenu: true,
  } as CoolConfig,
} as MidwayConfig;
