import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ForumGameConfigService } from '../../service/config';

/**
 * 论坛游戏化配置管理（签到奖励 / 等级体系）。
 * 读/写均走自定义 service（直写共享 Redis，forum 侧只读 + 校验 + 默认兜底）。
 * serviceApis 自动生成 POST 路由（前缀按控制器文件名）：/admin/forum/config/{method}，
 * 客户端对应 service.forum.config.{method}，方法接收请求 body。
 */
@Provide()
@CoolController({
  serviceApis: [
    { method: 'getConfig', summary: '读取签到/等级配置' },
    { method: 'saveCheckin', summary: '保存签到奖励配置' },
    { method: 'saveLevels', summary: '保存等级配置' },
  ],
  service: ForumGameConfigService,
})
export class AdminForumGameConfigController extends BaseController {}
