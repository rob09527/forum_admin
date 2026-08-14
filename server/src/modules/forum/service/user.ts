import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ForumUserEntity } from '../entity/user';

/**
 * 论坛用户服务。
 * 读（page/list/info）直接继承 BaseService 查 PG；
 * 写（改角色/封禁/调积分/重置密码）转发 forum server /api/admin/*，
 * 因为这些操作有业务联动（封禁踢下线、调积分写流水），不能在 admin 侧直接改库。
 */
@Provide()
export class ForumUserService extends BaseService {
  @InjectEntityModel(ForumUserEntity)
  forumUserEntity: Repository<ForumUserEntity>;

  @Config('forum.serverUrl')
  forumServerUrl: string;

  @Config('forum.adminKey')
  forumAdminKey: string;

  /**
   * 调 forum server 管理写接口，统一带服务间密钥并解析响应。
   */
  private async call(path: string, body: Record<string, unknown>) {
    try {
      const { data } = await axios.post(`${this.forumServerUrl}${path}`, body, {
        headers: { 'X-Admin-Key': this.forumAdminKey },
        timeout: 5000,
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

  /** 修改角色 user/mod/admin */
  async changeRole(id: number, role: string) {
    return this.call(`/api/admin/users/${id}/role`, { role });
  }

  /** 封禁/解封/禁言（banned 会踢下线） */
  async changeStatus(id: number, status: string) {
    return this.call(`/api/admin/users/${id}/status`, { status });
  }

  /** 调整鸡腿余额（可负），operator 为当前操作的管理员用户名，写入流水供审计追责 */
  async adjustPoints(id: number, delta: number, operator?: string) {
    return this.call(`/api/admin/users/${id}/points`, { delta, ...(operator ? { operator } : {}) });
  }

  /** 重置密码 */
  async resetPassword(id: number, password: string) {
    return this.call(`/api/admin/users/${id}/password`, { password });
  }
}
