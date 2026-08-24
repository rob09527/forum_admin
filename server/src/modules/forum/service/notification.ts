import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ForumNotificationEntity } from '../entity/notification';
import { ForumNotificationMessageEntity } from '../entity/notification-message';

/** 系统通知群发目标白名单（与 forum server 的 SystemNotifyTarget 对齐） */
const SYSTEM_TARGETS = ['all', 'role', 'users'];

/**
 * 论坛通知服务。
 * 列表（page/list/info）直接继承 BaseService 查 PG，用于排查与审计发送记录/已读状态；
 * 群发是复杂写（createMany + 在线用户 SSE 实时推送）→ 转发 forum server /api/admin/*。
 * 删除为简单行删除，无级联业务，直接继承 BaseService.delete。
 */
@Provide()
export class ForumNotificationService extends BaseService {
  @InjectEntityModel(ForumNotificationEntity)
  forumNotificationEntity: Repository<ForumNotificationEntity>;

  @InjectEntityModel(ForumNotificationMessageEntity)
  forumNotificationMessageEntity: Repository<ForumNotificationMessageEntity>;

  @Config('forum.serverUrl')
  forumServerUrl: string;

  @Config('forum.adminKey')
  forumAdminKey: string;

  /**
   * 通知分页列表。
   * 新群发通知 content=null + messageId 指向 notification_messages 表（正文只存一份），
   * 覆盖 page 按 messageId 批量回填 content，保证后台「内容」列正确展示（存量行 content 兜底）。
   */
  async page(query: any, option: any): Promise<any> {
    const res = await super.page(query, option);
    const rows = res?.list ?? [];
    const messageIds = [...new Set(rows.map((r) => r.messageId).filter((id) => id != null))];
    if (messageIds.length) {
      const messages = await this.forumNotificationMessageEntity
        .createQueryBuilder('m')
        .where('m.id IN (:...ids)', { ids: messageIds })
        .select(['m.id', 'm.content'])
        .getMany();
      const contentMap = new Map(messages.map((m) => [m.id, m.content]));
      for (const row of rows) {
        if (row.messageId != null && contentMap.has(row.messageId)) {
          row.content = contentMap.get(row.messageId) ?? row.content;
        }
      }
    }
    return res;
  }

  /**
   * 群发系统通知（转发 forum server，写库 + 在线用户实时推送）。
   * param: { target: 'all'|'role'|'users', role?, userIds?, content, postId? }
   */
  async broadcast(param: any): Promise<{ count: number }> {
    const content = (param?.content ?? '').trim();
    if (!content) {
      throw new CoolCommException('通知内容必填');
    }
    const target = SYSTEM_TARGETS.includes(param?.target) ? param.target : 'all';

    const body: Record<string, unknown> = {
      target,
      content,
      postId: param.postId ?? null,
    };
    if (target === 'role' && param.role) body.role = param.role;
    if (target === 'users' && Array.isArray(param.userIds) && param.userIds.length) {
      body.userIds = param.userIds;
    }

    try {
      const { data } = await axios.post(
        `${this.forumServerUrl}/api/admin/notifications/broadcast`,
        body,
        { headers: { 'X-Admin-Key': this.forumAdminKey }, timeout: 8000 }
      );
      if (!data?.success) {
        throw new CoolCommException(data?.error?.message || 'forum 接口调用失败');
      }
      // forum 返回 { sentCount }，归一为 { count } 便于前端展示
      return { count: data.data?.sentCount ?? 0 };
    } catch (err) {
      if (err instanceof CoolCommException) throw err;
      // axios 对非 2xx 抛错，把 forum 返回的业务错误 message 透传出来
      const message = err?.response?.data?.error?.message;
      throw new CoolCommException(message || '调用 forum 服务失败，请检查服务是否启动');
    }
  }
}
