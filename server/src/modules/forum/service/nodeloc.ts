import { Config, Provide } from '@midwayjs/core';
import { CoolCommException } from '@cool-midway/core';
import axios from 'axios';

/**
 * NodeLoc 数据导入管理服务。
 *
 * 与 service/config.ts 同款：不直连共享 Redis/PG，统一经 forum server 管理接口转发
 * （服务端单一写入口，配置契约只存 forum 侧）：
 *   GET    /api/admin/nodeloc/overview            读取导入概览（阶段/游标/映射量/影子规模）
 *   POST   /api/admin/nodeloc/topics/:id/reimport 单主题重灌（幂等，已导返回 skipped）
 *   POST   /api/admin/nodeloc/reindex             重建帖子搜索索引（回填完成后调用）
 *   PUT    /api/admin/config/nodeloc              启停 worker 开关热切换（复用 config 组，zod 校验）
 * 服务间带 X-Admin-Key，错误 message 透传（同 config.ts 的 call 模式）。
 */
@Provide()
export class ForumNodelocService {
  @Config('forum.serverUrl')
  forumServerUrl: string;

  @Config('forum.adminKey')
  forumAdminKey: string;

  /** 调 forum server 管理接口，统一带服务间密钥并解析响应（同 config.ts 的 call 同款）。 */
  private async call(method: 'get' | 'post' | 'put', path: string, body?: unknown) {
    try {
      const { data } = await axios.request({
        method,
        url: `${this.forumServerUrl}${path}`,
        data: body,
        headers: { 'X-Admin-Key': this.forumAdminKey },
        // reindex 全量重建索引耗时较长（上万帖分批写），超时放宽到 60s
        timeout: 60000,
      });
      if (!data?.success) {
        throw new CoolCommException(data?.error?.message || 'forum 接口调用失败');
      }
      return data.data;
    } catch (err) {
      if (err instanceof CoolCommException) throw err;
      // axios 对非 2xx 抛错，把 forum 返回的业务错误 message 透传出来
      const message = err?.response?.data?.error?.message;
      throw new CoolCommException(message || '调用 forum 服务失败，请检查服务是否启动');
    }
  }

  /** 读取导入概览：阶段/游标/回填页 + 映射量/影子规模，看板据此渲染 */
  async getOverview(): Promise<any> {
    return this.call('get', '/api/admin/nodeloc/overview');
  }

  /** 单主题重灌：body { topicId: number }，topicId 为对方 NodeLoc topic id */
  async reimportTopic(body: any): Promise<any> {
    const topicId = body?.topicId;
    if (!topicId) throw new CoolCommException('缺少 topicId');
    return this.call('post', `/api/admin/nodeloc/topics/${topicId}/reimport`);
  }

  /** 重建帖子搜索索引：回填完成后调用，否则回灌内容搜不到 */
  async reindex(): Promise<any> {
    return this.call('post', '/api/admin/nodeloc/reindex');
  }

  /** 启停 worker 开关热切换：body { syncEnabled: boolean }，forum 侧 zod 校验后落 config:nodeloc */
  async setSyncEnabled(body: any): Promise<any> {
    return this.call('put', '/api/admin/config/nodeloc', body);
  }
}
