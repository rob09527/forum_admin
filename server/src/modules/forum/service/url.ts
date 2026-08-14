import { CoolCommException } from '@cool-midway/core';

/**
 * 链接 / 图片 URL 协议白名单（论坛后台写入口统一校验）。
 *
 * 背景：前端 externalHref 会对无协议域名补 https://，导致 `javascript:` 之类被
 * 「恰好拼成 https://javascript:...」中和。这里在写入侧显式收敛协议，避免依赖巧合安全。
 */

/**
 * 站外跳转链接：仅允许 http(s):// 或站内路径（/ 开头），其余置 null。
 * 空串归一为 null（链接可空）。
 */
export function normalizeLink(link: any): string | null {
  if (link == null) return null;
  const s = String(link).trim();
  if (s === '') return null;
  if (/^(https?:\/\/|\/)/i.test(s)) return s;
  return null;
}

/**
 * 图片 URL：仅允许 http(s)://，其余抛错。
 * 图片必填，不能像链接那样静默置空，非法值直接拒绝让运营改正。
 */
export function assertHttpUrl(url: any, label = '图片'): string {
  const s = (url ?? '').trim();
  if (!s || !/^https?:\/\//i.test(s)) {
    throw new CoolCommException(`请上传合法的${label} URL（仅支持 http/https）`);
  }
  return s;
}
