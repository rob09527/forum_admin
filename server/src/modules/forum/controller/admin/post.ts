import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { ForumPostEntity } from '../../entity/post';
import { ForumUserEntity } from '../../entity/user';
import { ForumPostService } from '../../service/post';

/**
 * 论坛帖子管理的列表字段。
 * 列表刻意不含 content（Markdown 正文较大），正文走 info 按需拉取；
 * 通过 LEFT JOIN users 取作者名 b.username as authorName。
 */
const LIST_COLUMNS = [
  'a.id',
  'a.title',
  'a.category',
  'a.tags',
  'a.authorId',
  'a.viewCount',
  'a.likeCount',
  'a.commentCount',
  'a.isPinned',
  'a.createdAt',
  'a.updatedAt',
  'b.username as "authorName"',
];

/**
 * 论坛帖子管理。
 * 读走 Cool 框架自动生成的 page/list/info（join 用户表取作者名）；
 * 置顶是简单写直连 PG，删除转发 forum server。
 */
@Provide()
@CoolController({
  api: ['page', 'list', 'info'],
  entity: ForumPostEntity,
  service: ForumPostService,
  pageQueryOp: {
    select: LIST_COLUMNS,
    keyWordLikeFields: ['a.title', 'b.username'],
    fieldEq: ['category'],
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.authorId = b.id',
      },
    ],
    addOrderBy: { createdAt: 'DESC' },
  },
  listQueryOp: {
    select: LIST_COLUMNS,
    keyWordLikeFields: ['a.title', 'b.username'],
    fieldEq: ['category'],
    join: [
      {
        entity: ForumUserEntity,
        alias: 'b',
        condition: 'a.authorId = b.id',
      },
    ],
    addOrderBy: { createdAt: 'DESC' },
  },
})
export class AdminForumPostController extends BaseController {
  @Inject()
  forumPostService: ForumPostService;

  @Post('/togglePin', { summary: '置顶/取消置顶' })
  async togglePin(@Body('id') id: number, @Body('isPinned') isPinned: boolean) {
    return this.ok(await this.forumPostService.togglePin(id, isPinned));
  }

  @Post('/deletePost', { summary: '删除帖子' })
  async deletePost(@Body('id') id: number) {
    return this.ok(await this.forumPostService.deletePost(id));
  }

  @Post('/comments', { summary: '帖子评论树' })
  async comments(@Body('id') id: number) {
    return this.ok(await this.forumPostService.listComments(id));
  }
}
