import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import * as path from 'path';
import { pUploadPath } from '../comm/path';
import { availablePort } from '../comm/port';

// redis缓存
import { redisStore } from 'cache-manager-ioredis-yet';

export default {
  // 会话/签名密钥。生产必须注入 MIDWAY_KEYS 随机值；默认值仅限本地开发
  keys: process.env.MIDWAY_KEYS || '9cbe2380-877b-4fa9-b9fd-33a27c2e7486',
  koa: {
    port: Number(process.env.ADMIN_PORT) || availablePort(8001),
  },
  // 开启异步上下文管理
  asyncContextManager: {
    enable: true,
  },
  // 静态文件配置
  staticFile: {
    buffer: true,
    dirs: {
      default: {
        prefix: '/',
        dir: path.join(__dirname, '..', '..', 'public'),
      },
      static: {
        prefix: '/upload',
        dir: pUploadPath(),
      },
    },
  },
  // 文件上传
  upload: {
    fileSize: '200mb',
    whitelist: null,
  },
  // 缓存 使用 redis，与 forum server 共用同一个 redis 实例；host/port/password 走环境变量，本地有默认值
  cacheManager: {
    clients: {
      default: {
        store: redisStore,
        options: {
          port: Number(process.env.REDIS_PORT) || 6379,
          host: process.env.REDIS_HOST || '127.0.0.1',
          password: process.env.REDIS_PASSWORD || '',
          ttl: 0,
          db: 0,
        },
      },
    },
  },
  // forum server 服务间调用配置（admin 后端转发复杂写操作到 forum server）
  forum: {
    // forum server 地址
    serverUrl: process.env.FORUM_SERVER_URL || 'http://127.0.0.1:3001',
    // 服务间密钥，需与 forum server 的 FORUM_ADMIN_KEY 一致。
    // 无默认值：未配置时转发调用会因密钥为空被 forum server 拒绝（forum server 侧必填校验兜底）
    adminKey: process.env.FORUM_ADMIN_KEY || '',
  },
  cool: {
    // 已经插件化，本地文件上传查看 plugin/config.ts，其他云存储查看对应插件的使用
    file: {},
    // 是否开启多租户
    tenant: {
      // 是否开启多租户
      enable: false,
      // 需要过滤多租户的url, 支持通配符， 如/admin/**/* 表示admin模块下的所有接口都进行多租户过滤
      urls: [],
    },
    // 国际化配置
    i18n: {
      // 是否开启
      enable: false,
      // 语言
      languages: ['zh-cn', 'zh-tw', 'en'],
    },
    // crud配置
    crud: {
      // 插入模式，save不会校验字段(允许传入不存在的字段)，insert会校验字段
      upsert: 'save',
      // 软删除
      softDelete: true,
    },
  } as CoolConfig,
} as MidwayConfig;
