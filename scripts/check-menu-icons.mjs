#!/usr/bin/env node
/**
 * 菜单图标校验脚本（防「menu.json 引用不存在的图标」回归）。
 *
 * 背景：后台菜单图标是 client 侧 `virtual:svg-icons` 从
 *   client/src/modules/base/static/svg/icon-*.svg 生成的，menu.json 里的 icon 名
 *   必须与某个 icon-*.svg 文件名（去 .svg 后缀）完全一致；写错名字（如 icon-chart /
 *   icon-color / icon-red-packet）不会报错、只是菜单上不显示图标，很隐蔽。
 *
 * 用法：node scripts/check-menu-icons.mjs
 * 退出码：0 = 全部合法；1 = 存在不存在的图标（CI / 部署前卡住，避免带病上线）。
 *
 * 校验范围：server/src/modules/**\/menu.json 里所有非空 icon（递归含 childMenus）。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// 脚本位于 admin/scripts/，admin 仓库根在上一级
const root = resolve(here, '..');
const serverModulesDir = join(root, 'server', 'src', 'modules');
const svgDir = join(root, 'client', 'src', 'modules', 'base', 'static', 'svg');

/**
 * 收集菜单树里所有「会渲染到侧边栏」的非空 icon 名。
 * isShow === false 的菜单（如框架「通用」工具组）不在侧边栏展示、其 icon 不渲染，
 * 跳过以避免误报框架自带菜单里的历史遗留 icon。
 */
function collectIcons(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.isShow !== false && typeof node.icon === 'string' && node.icon.trim() !== '') {
    out.add(node.icon.trim());
  }
  const children = Array.isArray(node.childMenus) ? node.childMenus : [];
  for (const child of children) collectIcons(child, out);
}

function main() {
  if (!existsSync(svgDir)) {
    console.error(`[check-menu-icons] 未找到图标目录：${svgDir}`);
    process.exit(2);
  }

  // 合法图标名 = 所有 icon-*.svg 的文件名（去后缀）
  const valid = new Set(
    readdirSync(svgDir)
      .filter((f) => f.startsWith('icon-') && f.endsWith('.svg'))
      .map((f) => f.slice(0, -'.svg'.length)),
  );

  // 找到所有模块 menu.json
  const menuFiles = [];
  if (existsSync(serverModulesDir)) {
    for (const mod of readdirSync(serverModulesDir)) {
      const p = join(serverModulesDir, mod, 'menu.json');
      if (existsSync(p)) menuFiles.push(p);
    }
  }
  if (menuFiles.length === 0) {
    console.warn('[check-menu-icons] 未找到任何 menu.json，跳过');
    process.exit(0);
  }

  let bad = 0;
  for (const file of menuFiles) {
    const menus = JSON.parse(readFileSync(file, 'utf8'));
    const used = new Set();
    for (const menu of menus) collectIcons(menu, used);

    const missing = [...used].filter((icon) => !valid.has(icon));
    if (missing.length > 0) {
      bad += missing.length;
      console.error(`[check-menu-icons] ${file} 引用了不存在的图标：`);
      for (const icon of missing) {
        console.error(`  - ${icon}（可用图标见 client/src/modules/base/static/svg/）`);
      }
    }
  }

  if (bad > 0) {
    console.error(`\n[check-menu-icons] 共 ${bad} 个图标不存在，请改用 svg 目录里存在的 icon-* 名称。`);
    process.exit(1);
  }
  console.log(`[check-menu-icons] 通过：${menuFiles.length} 个 menu.json 的图标均合法。`);
}

main();
