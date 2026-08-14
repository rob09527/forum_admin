import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import { entities } from '../entities';
import { TenantSubscriber } from '../modules/base/db/tenant';

/**
 * 生产环境配置。
 * 数据库连接从 DATABASE_URL 环境变量读取（与 forum server 命名一致，TypeORM 支持 url 连接串），
 * 不再硬编码 127.0.0.1/rob。生产漏配 DATABASE_URL 会在启动连接时报错 fail-fast。
 */
export default {
  typeorm: {
    dataSource: {
      default: {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        // 自动建表 注意：线上部署的时候不要使用，有可能导致数据丢失
        synchronize: false,
        // 打印日志
        logging: false,
        // 是否开启缓存
        cache: true,
        // 实体路径
        entities,
        // 订阅者
        subscribers: [TenantSubscriber],
      },
    },
  },
  cool: {
    // 实体与路径，跟生成代码、前端请求、swagger文档相关 注意：线上不建议开启，以免暴露敏感信息
    eps: false,
    // 是否自动导入模块数据库
    initDB: false,
    // 判断是否初始化的方式
    initJudge: 'db',
    // 是否自动导入模块菜单
    initMenu: false,
  } as CoolConfig,
} as MidwayConfig;
