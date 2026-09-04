import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumNodelocService } from '../../service/nodeloc';

/**
 * NodeLoc 数据导入管理（只读监控看板 + 安全调控）。
 * 读/写经 service 转发 forum server 管理接口（服务端单一写入口，admin 不直连共享 Redis/PG），
 * 数据契约（阶段/游标/映射量统计 + 重灌/重建索引/启停开关）只在 forum 侧存一份，见 service/nodeloc.ts。
 * serviceApis 自动生成路由（前缀按控制器文件名）：/admin/forum/nodeloc/{method}，
 * 客户端对应 service.forum.nodeloc.{method}，方法接收请求 body。
 *
 * ⚠️ 危险操作（清空重 0 / 切 phase / 推退游标）不进此控制器，仍走 CLI（deploy/manage.sh reset-import）。
 */
@Provide()
@CoolController({
  serviceApis: [
    { method: 'getOverview', summary: '读取导入概览（阶段/游标/映射量/影子规模）' },
    { method: 'reimportTopic', summary: '单主题重灌（body: { topicId }，幂等）' },
    { method: 'reindex', summary: '重建帖子搜索索引（回填完成后执行）' },
    { method: 'setSyncEnabled', summary: '启停同步 worker 开关（热切换，body: { syncEnabled }）' },
  ],
  service: ForumNodelocService,
})
export class AdminForumNodelocController extends BaseController {}
