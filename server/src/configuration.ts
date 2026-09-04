// 加载 .env（与 forum server 的 config.ts 同款模式）：本地开发密钥/地址统一放
// admin/server/.env；生产由 docker-compose 注入进程环境变量（dotenv 不覆盖已存在的环境变量）
import 'dotenv/config';
import * as orm from '@midwayjs/typeorm';
import { InjectDataSource } from '@midwayjs/typeorm';
import {
  Configuration,
  App,
  IMidwayApplication,
  Inject,
  ILogger,
  MidwayWebRouterService,
} from '@midwayjs/core';
import { DataSource } from 'typeorm';
import * as koa from '@midwayjs/koa';
// import * as crossDomain from '@midwayjs/cross-domain';
import * as validate from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import * as staticFile from '@midwayjs/static-file';
import * as cron from '@midwayjs/cron';
import * as DefaultConfig from './config/config.default';
import * as LocalConfig from './config/config.local';
import * as ProdConfig from './config/config.prod';
import * as cool from '@cool-midway/core';
import * as upload from '@midwayjs/upload';
import { ForumUserEntity } from './modules/forum/entity/user';
import { ForumPostEntity } from './modules/forum/entity/post';
import { ForumCommentEntity } from './modules/forum/entity/comment';
import { ForumPointLogEntity } from './modules/forum/entity/pointLog';
import { ForumCategoryEntity } from './modules/forum/entity/category';
import { ForumAnnouncementEntity } from './modules/forum/entity/announcement';
import { ForumAdvertEntity } from './modules/forum/entity/advert';
import { ForumShopItemEntity } from './modules/forum/entity/shopItem';
import { ForumUserDecorationEntity } from './modules/forum/entity/userDecoration';
import { ForumTipEntity } from './modules/forum/entity/tip';
import { ForumBountyEntity } from './modules/forum/entity/bounty';
import { ForumNotificationEntity } from './modules/forum/entity/notification';
import { ForumNotificationMessageEntity } from './modules/forum/entity/notification-message';
// import * as task from '@cool-midway/task';
// import * as rpc from '@cool-midway/rpc';

@Configuration({
  imports: [
    // https://koajs.com/
    koa,
    // 是否开启跨域(注：顺序不能乱放！！！) http://www.midwayjs.org/docs/extensions/cross_domain
    // crossDomain,
    // 静态文件托管 https://midwayjs.org/docs/extensions/static_file
    staticFile,
    // orm https://midwayjs.org/docs/extensions/orm
    orm,
    // 参数验证 https://midwayjs.org/docs/extensions/validate
    validate,
    // 本地任务 http://www.midwayjs.org/docs/extensions/cron
    cron,
    // 文件上传
    upload,
    // cool-admin 官方组件 https://cool-js.com
    cool,
    // rpc 微服务 远程调用
    // rpc,
    // 任务与队列
    // task,
    {
      component: info,
      // npm run dev → NODE_ENV=local；npm run start → NODE_ENV=production（Midway 别名映射到 prod 配置）
      enabledEnvironment: ['local', 'production'],
    },
  ],
  importConfigs: [
    {
      default: DefaultConfig,
      local: LocalConfig,
      prod: ProdConfig,
    },
  ],
})
export class MainConfiguration {
  @App()
  app: IMidwayApplication;

  @Inject()
  webRouterService: MidwayWebRouterService;

  @Inject()
  logger: ILogger;

  @InjectDataSource('default')
  dataSource: DataSource;

  /** forum 模块的全部实体（与 Prisma 管理的共享库表一一对应） */
  private forumEntities = [
    ForumUserEntity,
    ForumPostEntity,
    ForumCommentEntity,
    ForumPointLogEntity,
    ForumCategoryEntity,
    ForumAnnouncementEntity,
    ForumAdvertEntity,
    // 积分消费体系（docs/积分消费体系.md 第 4.1 节）：4 张新表，遗漏会导致启动 schema 漂移 fail-fast
    ForumShopItemEntity,
    ForumUserDecorationEntity,
    ForumTipEntity,
    ForumBountyEntity,
    // 通知体系 2 张表：此前漏登记，导致 forum server 改这两张表结构时 admin 启动自检发现不了漂移
    // （TypeORM 仍会加载它们，见 src/entities.ts，所以运行时会真的报「列不存在」）
    ForumNotificationEntity,
    ForumNotificationMessageEntity,
  ];

  async onReady() {
    await this.checkForumSchema();
  }

  /**
   * forum schema 漂移自检。
   * forum server 用 Prisma 迁移管理共享库表，这里用 TypeORM entity 直连读写。
   * 两套 schema 手抄维护易漂移，本方法在启动时把 entity 声明的列与库中真实列比对：
   * - entity 有、库没有 → 致命：TypeORM 生成的 SQL 会引用不存在的列，运行时必报错，应 fail-fast；
   * - 库有、entity 没有 → 告警：后台读不到新字段（可能刻意忽略敏感字段，也可能漏映射）。
   * 只查共享 PG 的 information_schema，不依赖 forum server 存活，不影响后台独立性。
   */
  private async checkForumSchema() {
    const fatal: string[] = [];
    const warn: string[] = [];

    for (const Entity of this.forumEntities) {
      const meta = this.dataSource.getMetadata(Entity);
      const table = meta.tableName;
      const entityCols = new Set(meta.columns.map((c) => c.databaseName));

      const rows: { column_name: string }[] = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      const dbCols = new Set(rows.map((r) => r.column_name));

      for (const c of entityCols) if (!dbCols.has(c)) fatal.push(`${table}.${c}`);
      for (const c of dbCols) if (!entityCols.has(c)) warn.push(`${table}.${c}`);
    }

    if (warn.length) {
      this.logger.warn(
        'forum 表存在未映射的列（可能是刻意忽略敏感字段，也可能是 forum server 迁移后漏映射）: ' + warn.join(', '),
      );
    }
    if (fatal.length) {
      const msg =
        'forum schema 漂移：entity 声明的列在数据库中不存在，TypeORM 查询将报错（可能是 forum server 迁移已改动表结构）: ' +
        fatal.join(', ');
      this.logger.error(msg);
      // 生产 fail-fast，避免带病启动；dev 只报错方便排查。
      // 注意 NODE_ENV 是 'production'（'prod' 只是 Midway 内部环境别名，不是 process.env 值）
      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }
    }
  }
}
