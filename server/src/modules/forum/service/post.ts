import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ForumPostEntity } from '../entity/post';
import { ForumCommentEntity } from '../entity/comment';

/**
 * 论坛帖子服务。
 * 读（page/list/info）直接继承 BaseService 查 PG（列表经 join 带作者名，见 controller）；
 * 置顶/取消置顶是简单布尔写（无级联/无缓存）→ 直连 PG；
 * 删除是复杂写（级联删评论/点赞/图片 + 作者发帖数 -1）→ 转发 forum server /api/admin/*。
 */
@Provide()
export class ForumPostService extends BaseService {
  @InjectEntityModel(ForumPostEntity)
  forumPostEntity: Repository<ForumPostEntity>;

  @InjectEntityModel(ForumCommentEntity)
  forumCommentEntity: Repository<ForumCommentEntity>;

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

  /** 置顶/取消置顶（简单写，直连 PG） */
  async togglePin(id: number, isPinned: boolean) {
    await this.forumPostEntity.update(id, { isPinned });
    return { id, isPinned };
  }

  /** 删除帖子（复杂写，转发 forum server，级联清理） */
  async deletePost(id: number) {
    return this.call(`/api/admin/posts/${id}/delete`, {});
  }

  /**
   * 帖子评论树（读，直连 PG）。
   * join users 取作者名；楼层 + 楼中楼递归树算法与 forum server listPostComments 保持一致。
   */
  async listComments(postId: number) {
    const rows: any[] = await this.forumCommentEntity.manager.query(
      `SELECT c.id, c.content, c."parentId", c.floor, c."likeCount", c."createdAt", u.username
         FROM comments c
         LEFT JOIN users u ON c."authorId" = u.id
        WHERE c."postId" = $1
        ORDER BY c."createdAt" ASC`,
      [postId],
    );

    // 构建递归树：第一遍建 map，第二遍按 parentId 挂入父节点 replies
    const map = new Map<number, any>();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        content: r.content,
        parentId: r.parentId,
        floor: r.floor,
        likeCount: r.likeCount,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        authorName: r.username || '',
        replies: [],
      });
    }
    const topLevel: any[] = [];
    for (const r of rows) {
      const item = map.get(r.id)!;
      if (r.parentId !== null && map.has(r.parentId)) {
        map.get(r.parentId)!.replies.push(item);
      } else {
        topLevel.push(item);
      }
    }
    // 顶层按楼层号升序，无楼层（异常数据）排最后
    topLevel.sort((a, b) => {
      if (a.floor === null && b.floor === null) return 0;
      if (a.floor === null) return 1;
      if (b.floor === null) return -1;
      return a.floor - b.floor;
    });
    return topLevel;
  }
}
