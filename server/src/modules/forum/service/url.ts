import { CoolCommException } from '@cool-midway/core';

/**
 * 链接 / 图片 URL 协议白名单（论坛后台写入口统一校验）。
 *
 * 背景：前端 externalHref 会对无协议域名补 https://，导致 `javascript:` 之类被
 * 「恰好拼成 https://javascript:...」中和。这里在写入侧显式收敛协议，避免依赖巧合安全。
 */

/**
 * 站外跳转链接：仅允许 http(s)://、协议相对 // 或站内路径（/ 开头），其余置 null。
 * 裸域名/裸 IP（如 www.baidu.com、localhost:3001）自动补 https://，与前台 externalHref 行为对齐。
 * 空串归一为 null（链接可空）。
 *
 * 安全性：从字符集上排除 javascript:、data: 等非 http 协议（以及空格），
 * 不依赖「无协议时补 https:// 恰好中和」的巧合安全，在写入侧显式收敛。
 */
export function normalizeLink(link: any): string | null {
  if (link == null) return null;
  const s = String(link).trim();
  if (s === '') return null;

  // 站内路径：/ 开头原样保留
  if (s.startsWith('/')) return s;

  // 显式协议：仅放行 http/https（含协议相对 //），其余 scheme 一律拒绝
  if (/^(https?:\/\/|\/\/)/i.test(s)) return s;

  // 裸域名/裸 IP：仅允许 字母/数字/._-（可含 :端口 与 /?# 路径段），补 https://
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*(?::\d{1,5})?(?:[/?#][^\s]*)?)?$/.test(s)) {
    return `https://${s}`;
  }

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
