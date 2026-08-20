import { Config, Provide } from '@midwayjs/core';
import { Redis } from 'ioredis';
import { CoolCommException } from '@cool-midway/core';

/**
 * 游戏化配置（签到奖励 / 等级体系）服务。
 *
 * 由后台控制、直写与 forum server 共用的共享 Redis（db:0）；forum 侧只读 + 校验 + 默认兜底
 * （见 server/src/services/config/config.service.ts 与 server/src/constants/redis-keys.ts）。
 *
 * 用原生 ioredis 而非 cache-manager：cache-manager 的 key 会带前缀/序列化不确定，
 * 这里必须写入与 forum 侧完全一致的裸 key 与 JSON 字符串。
 * Redis 连接参数复用 cacheManager 的 clients.default.options（host/port/password/db）。
 */

/** 与 forum server 的 RedisKey.configCheckin / configLevels 保持一致 */
const CONFIG_CHECKIN_KEY = 'config:checkin';
const CONFIG_LEVELS_KEY = 'config:levels';

@Provide()
export class ForumGameConfigService {
  @Config('cacheManager')
  cacheManagerConfig: any;

  private client: Redis | null = null;

  /** 原生 ioredis 客户端（惰性创建，Singleton 复用） */
  private get redis(): Redis {
    if (!this.client) {
      const opts = this.cacheManagerConfig?.clients?.default?.options ?? {};
      const client = new Redis({
        host: opts.host || '127.0.0.1',
        port: opts.port || 6379,
        password: opts.password || '',
        db: opts.db ?? 0,
        lazyConnect: true,
      });
      client.connect().catch((err) =>
        console.error('[game-config] Redis 连接失败:', (err as Error).message)
      );
      this.client = client;
    }
    return this.client;
  }

  /**
   * 读取当前配置。key 缺失/非法 JSON 返回 null，页面据此展示默认值（forum 侧兜底）。
   */
  async getConfig(): Promise<{ checkin: any; levels: any }> {
    const [checkinRaw, levelsRaw] = await Promise.all([
      this.redis.get(CONFIG_CHECKIN_KEY),
      this.redis.get(CONFIG_LEVELS_KEY),
    ]);
    return {
      checkin: this.safeParse(checkinRaw),
      levels: this.safeParse(levelsRaw),
    };
  }

  /** 保存签到奖励配置（校验后直写共享 Redis） */
  async saveCheckin(cfg: any): Promise<void> {
    this.assertCheckin(cfg);
    await this.redis.set(CONFIG_CHECKIN_KEY, JSON.stringify(cfg));
  }

  /** 保存等级配置（校验后直写共享 Redis） */
  async saveLevels(levels: any): Promise<void> {
    this.assertLevels(levels);
    await this.redis.set(CONFIG_LEVELS_KEY, JSON.stringify(levels));
  }

  private safeParse(raw: string | null): any {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** 签到配置校验：5 个参数均为整数，milestoneEvery 至少 1 */
  private assertCheckin(cfg: any): void {
    const fields: Array<[string, number]> = [
      ['base', 0],
      ['streakBonusPerDay', 0],
      ['streakBonusCap', 0],
      ['milestoneEvery', 1],
      ['milestoneBonus', 0],
    ];
    for (const [key, min] of fields) {
      const v = cfg?.[key];
      if (!Number.isInteger(v) || v < min) {
        throw new CoolCommException(`签到配置「${key}」必须是不小于 ${min} 的整数`);
      }
    }
  }

  /**
   * 等级配置校验（与 forum 侧 levelsSchema 约束一致）：
   * 非空、key 唯一、恰好一个 minTotal=0 的起始等级、按门槛严格降序。
   */
  private assertLevels(levels: any): void {
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new CoolCommException('等级列表不能为空');
    }
    const keys = new Set<string>();
    let baseCount = 0;
    for (let i = 0; i < levels.length; i++) {
      const l = levels[i];
      if (typeof l?.key !== 'string' || !l.key.trim()) {
        throw new CoolCommException(`第 ${i + 1} 级缺少等级 key`);
      }
      if (typeof l?.name !== 'string' || !l.name.trim()) {
        throw new CoolCommException(`等级「${l.key}」缺少中文名`);
      }
      if (!Number.isInteger(l.minTotal) || l.minTotal < 0) {
        throw new CoolCommException(`等级「${l.key}」的门槛必须是不小于 0 的整数`);
      }
      if (keys.has(l.key)) {
        throw new CoolCommException(`等级 key「${l.key}」重复`);
      }
      keys.add(l.key);
      if (l.minTotal === 0) baseCount++;
      if (i > 0 && levels[i - 1].minTotal <= l.minTotal) {
        throw new CoolCommException('等级需按门槛严格降序排列（高的在前）');
      }
    }
    if (baseCount !== 1) {
      throw new CoolCommException('必须恰好一个门槛为 0 的起始等级');
    }
  }
}
