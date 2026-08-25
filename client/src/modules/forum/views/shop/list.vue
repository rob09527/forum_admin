<template>
	<el-scrollbar>
		<div class="shop-catalog-page">
			<!-- 顶部说明 + 同步 -->
			<div class="toolbar">
				<div>
					<div class="toolbar-title">🛍️ 装饰商品目录</div>
					<div class="toolbar-tip">
						称号 = 图片索引 · 颜色 = 固定 18 色 · 头像 = 18 风格 × 20 个（<b>免费池 6 风格</b> + 其余 12 风格付费租用 300🍗/90 天）。免费池头像<b>不允许收费</b>（价格锁定 0）、<b>永久有效</b>（不设时效）、<b>不在商城展示</b>。运营只改<b>权重 / 价格 / 天数 / 上下架</b>，商品名与渲染值由系统目录固定、不可填写。
					</div>
				</div>
				<div class="toolbar-right">
					<el-button v-permission="service.forum.shopItem.permission.sync" type="primary" :loading="syncing" @click="onSync">
						同步商品目录
					</el-button>
				</div>
			</div>

			<el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-3" />
			<el-skeleton v-if="loading" :rows="8" animated />

			<!-- 顶层 Tab：一次只看一个分类，避免 400+ 商品全铺一页 -->
			<el-tabs v-if="!loading" v-model="activeTab" class="catalog-tabs">
				<!-- 称号区 -->
				<el-tab-pane :label="`🎖 专属称号（${titles.length}）`" name="title">
					<div class="grid">
						<div v-for="it in titles" :key="it.renderValue" class="cell" :class="{ off: !it.isActive }">
							<div class="thumb thumb-img">
								<img :src="titleIconUrl(it.renderValue)" :alt="it.name" />
							</div>
							<div class="name">{{ it.name }}</div>
							<div class="meta">{{ it.renderValue }}</div>
							<div class="controls">
								<div class="control">
									<label>价格</label>
									<el-input-number v-model="it.price" :min="1" :step="10" size="small" @change="save(it)" />
								</div>
								<div class="control">
									<label>权重</label>
									<el-input-number v-model="it.sortOrder" :min="0" :max="999" size="small" @change="save(it)" />
								</div>
								<div class="control">
									<label>天数</label>
									<el-input-number v-model="it.durationDays" :min="1" :max="3650" size="small" @change="save(it)" />
								</div>
								<div class="control control-switch">
									<label>上架</label>
									<el-switch v-model="it.isActive" @change="save(it)" />
								</div>
							</div>
						</div>
					</div>
				</el-tab-pane>

				<!-- 颜色区 -->
				<el-tab-pane :label="`🎨 用户名颜色（${colors.length}）`" name="color">
					<div class="grid">
						<div v-for="it in colors" :key="it.renderValue" class="cell" :class="{ off: !it.isActive }">
							<div class="thumb thumb-color">
								<span class="swatch" :style="{ background: it.renderValue }" />
								<span class="sample" :style="{ color: it.renderValue }">用户名</span>
							</div>
							<div class="name">{{ it.name }}</div>
							<div class="meta">{{ it.renderValue }}</div>
							<div class="controls">
								<div class="control">
									<label>价格</label>
									<el-input-number v-model="it.price" :min="1" :step="10" size="small" @change="save(it)" />
								</div>
								<div class="control">
									<label>权重</label>
									<el-input-number v-model="it.sortOrder" :min="0" :max="999" size="small" @change="save(it)" />
								</div>
								<div class="control">
									<label>天数</label>
									<el-input-number v-model="it.durationDays" :min="1" :max="3650" size="small" @change="save(it)" />
								</div>
								<div class="control control-switch">
									<label>上架</label>
									<el-switch v-model="it.isActive" @change="save(it)" />
								</div>
							</div>
						</div>
					</div>
				</el-tab-pane>

				<!-- 头像区：风格 pill 切换（中文名 + 图标），一次只显示选中风格的 20 个 -->
				<el-tab-pane :label="`👤 头像（${avatars.length}）`" name="avatar">
					<div class="style-bar">
						<button
							v-for="g in avatarGroups"
							:key="g.style"
							class="style-pill"
							:class="{ on: activeStyle === g.style }"
							@click="switchStyle(g.style)"
						>
							<span>{{ g.icon }}</span>
							<span>{{ g.label }}</span>
						</button>
					</div>
					<div v-if="activeGroup" class="avatar-head">
						<el-button text :disabled="!hasPrevStyle" size="small" @click="stepStyle(-1)">← 上一个</el-button>
						<span class="style-title">{{ activeGroup.icon }} {{ activeGroup.label }}</span>
						<span class="style-count">{{ activeGroup.items.length }} 个 · {{ activeGroup.style }}</span>
						<el-button text :disabled="!hasNextStyle" size="small" @click="stepStyle(1)">下一个 →</el-button>
					</div>
					<div v-if="activeGroup" class="grid grid-avatar">
						<div v-for="it in activeGroup.items" :key="it.renderValue" class="cell avatar-cell" :class="{ off: !it.isActive }">
							<div class="thumb thumb-avatar">
								<img :src="it.renderValue" :alt="it.name" loading="lazy" />
							</div>
							<div class="name">
								{{ it.name }}
								<span v-if="isFreePoolAvatar(it.renderValue)" class="free-badge">免费池</span>
							</div>
							<div class="meta">{{ isFreePoolAvatar(it.renderValue) ? '免费池子头像 · 不允许收费 · 永久有效' : (it.price > 0 ? `🍗 ${it.price} / ${it.durationDays}天` : '免费') }}</div>
							<div class="controls">
								<div class="control">
									<label>价格</label>
									<el-input-number v-if="!isFreePoolAvatar(it.renderValue)" v-model="it.price" :min="0" :step="10" size="small" @change="save(it)" />
									<span v-else class="free-locked">0（免费池）</span>
								</div>
								<div class="control">
									<label>权重</label>
									<el-input-number v-model="it.sortOrder" :min="0" :max="999" size="small" @change="save(it)" />
								</div>
								<div class="control">
									<label>天数</label>
									<el-input-number v-if="!isFreePoolAvatar(it.renderValue)" v-model="it.durationDays" :min="1" :max="3650" size="small" @change="save(it)" />
									<span v-else class="free-locked">永久（免费池）</span>
								</div>
								<div class="control control-switch">
									<label>上架</label>
									<el-switch v-model="it.isActive" @change="save(it)" />
								</div>
							</div>
						</div>
					</div>
				</el-tab-pane>
			</el-tabs>
		</div>
	</el-scrollbar>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-shop-list'
});

import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';

const { service } = useCool();

/** 目录条目（catalog 接口合并 DB 现状后返回） */
interface CatalogEntry {
	id: number | null;
	type: string;
	name: string;
	renderValue: string;
	price: number;
	durationDays: number;
	sortOrder: number;
	isActive: boolean;
	seeded: boolean;
}

const titles = ref<CatalogEntry[]>([]);
const colors = ref<CatalogEntry[]>([]);
const avatars = ref<CatalogEntry[]>([]);
const loading = ref(false);
const syncing = ref(false);
const error = ref('');

/** 顶层 Tab：一次只看一个分类（称号 / 颜色 / 头像） */
const activeTab = ref('title');
/** 头像手风琴当前展开的风格；数据加载后默认展开第一个 */
const activeStyle = ref('');

/** 头像风格 id → 中文名 + 图标（与业务端 AvatarPicker 展示一致；未知名兜底显示 id）。
 * 已弃用风格（涂鸦2/印象2）头像文件已删除，不再列出。 */
const STYLE_META: Record<string, { label: string; icon: string }> = {
  'bottts-neutral':     { label: '机器人', icon: '🤖' },
  avataaars:            { label: '卡通',   icon: '👤' },
  'pixel-art':          { label: '像素',   icon: '👾' },
  identicon:            { label: '几何',   icon: '🔷' },
  lorelei:              { label: '顽趣',   icon: '😄' },
  thumbs:               { label: '拇指',   icon: '👍' },
  adventurer:           { label: '冒险',   icon: '🧭' },
  'adventurer-neutral': { label: '冒险2',  icon: '🗺️' },
  'big-ears':           { label: '大耳',   icon: '👂' },
  'big-ears-neutral':   { label: '大耳2',  icon: '🐰' },
  'big-smile':          { label: '笑脸',   icon: '😁' },
  croodles:             { label: '涂鸦',   icon: '✏️' },
  'fun-emoji':          { label: '表情',   icon: '😎' },
  micah:                { label: '米卡',   icon: '🧑' },
  miniavs:              { label: '迷你',   icon: '🟢' },
  notionists:           { label: '印象',   icon: '🎨' },
  'open-peeps':         { label: '人物',   icon: '🙂' },
  personas:             { label: '角色',   icon: '🦸' },
};

/** 免费池头像风格（与后台目录 AVATAR_FREE_STYLES 一致）：价格锁定 0、不允许收费、永久有效 */
const FREE_AVATAR_STYLES = ['bottts-neutral', 'identicon', 'thumbs', 'fun-emoji', 'adventurer-neutral', 'big-ears-neutral'];
function isFreePoolAvatar(renderValue: string): boolean {
  return FREE_AVATAR_STYLES.some((s) => renderValue.startsWith(`/avatars/${s}/`));
}

/** 头像按风格分组（路径 /avatars/{style}/avatar-{nn}.svg 解析风格）。
 * 组序按目录 sortOrder（风格*20+n）稳定排序，保证与业务端展示顺序一致。 */
const avatarGroups = computed(() => {
  const byStyle = new Map<string, CatalogEntry[]>();
  for (const it of avatars.value) {
    const m = it.renderValue.match(/^\/avatars\/([^/]+)\//);
    const style = m?.[1] ?? 'unknown';
    const list = byStyle.get(style) ?? [];
    list.push(it);
    byStyle.set(style, list);
  }
  const groups = [...byStyle.entries()].map(([style, items]) => ({
    style,
    items,
    label: STYLE_META[style]?.label ?? style,
    icon: STYLE_META[style]?.icon ?? '👤',
  }));
  groups.sort(
    (a, b) => Math.min(...a.items.map((i) => i.sortOrder)) - Math.min(...b.items.map((i) => i.sortOrder)),
  );
  return groups;
});

/** 当前选中风格及其分组 */
const activeGroup = computed(() => avatarGroups.value.find((g) => g.style === activeStyle.value) ?? null);

function switchStyle(style: string) {
  activeStyle.value = style;
}

/** 前后切换风格（对应「上一个 / 下一个」按钮） */
function stepStyle(dir: number) {
  const idx = avatarGroups.value.findIndex((g) => g.style === activeStyle.value);
  const next = avatarGroups.value[idx + dir];
  if (next) activeStyle.value = next.style;
}
const hasPrevStyle = computed(() => avatarGroups.value.findIndex((g) => g.style === activeStyle.value) > 0);
const hasNextStyle = computed(() => {
  const idx = avatarGroups.value.findIndex((g) => g.style === activeStyle.value);
  return idx >= 0 && idx < avatarGroups.value.length - 1;
});

/** 称号图片索引 → 静态资源 URL（admin 自身 public 目录已拷贝一份 webp） */
function titleIconUrl(renderValue: string): string {
	return `/images/title-icons/${renderValue}.webp`;
}

async function loadCatalog() {
	loading.value = true;
	error.value = '';
	try {
		const data: any = await service.forum.shopItem.catalog();
		titles.value = data?.titles ?? [];
		colors.value = data?.colors ?? [];
		avatars.value = data?.avatars ?? [];
		// 加载后默认展开第一个头像风格，避免整页空白
		if (!activeStyle.value && avatarGroups.value.length) {
			activeStyle.value = avatarGroups.value[0].style;
		}
	} catch (err: any) {
		error.value = '读取商品目录失败';
		console.error('[shop] 读取目录失败:', err);
	} finally {
		loading.value = false;
	}
}

/** 保存单个商品的 权重/价格/天数/上下架（只改这四项，目录语义不变） */
async function save(it: CatalogEntry) {
	if (it.id == null) return;
	try {
		await service.forum.shopItem.update({
			id: it.id,
			price: it.price,
			sortOrder: it.sortOrder,
			durationDays: it.durationDays,
			isActive: it.isActive
		});
	} catch (err: any) {
		showError(err, '保存失败');
	}
}

/** 同步商品目录（幂等补齐缺失行，一般首次进入已自动补种） */
async function onSync() {
	syncing.value = true;
	try {
		const res: any = await service.forum.shopItem.sync();
		ElMessage.success(`同步完成，新增 ${res?.created ?? 0} 个商品`);
		await loadCatalog();
	} catch (err: any) {
		showError(err, '同步失败');
	} finally {
		syncing.value = false;
	}
}

onMounted(loadCatalog);
</script>

<style scoped>
.shop-catalog-page {
	padding: 4px;
}
.toolbar {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 14px;
}
.toolbar-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}
.toolbar-tip {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.5;
	margin-top: 4px;
}
.toolbar-tip b {
	color: var(--el-color-primary);
}
.section {
	margin-bottom: 16px;
}
.section-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}
.catalog-tabs {
	margin-top: 4px;
}
.style-bar {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 14px;
}
.style-pill {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 5px 12px;
	border-radius: 16px;
	border: 1px solid var(--el-border-color-lighter);
	background: #fff;
	font-size: 12px;
	color: var(--el-text-color-regular);
	cursor: pointer;
	transition: all 0.15s;
}
.style-pill:hover {
	border-color: var(--el-color-primary);
	color: var(--el-color-primary);
}
.style-pill.on {
	background: var(--el-color-primary);
	border-color: var(--el-color-primary);
	color: #fff;
	font-weight: 600;
}
.avatar-head {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}
.style-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--el-color-primary);
}
.style-count {
	font-size: 12px;
	color: var(--el-text-color-secondary);
}
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 12px;
}
.cell {
	border: 1px solid var(--el-border-color-lighter);
	border-radius: 8px;
	padding: 12px;
	transition: opacity 0.15s;
}
.cell.off {
	opacity: 0.5;
}
.thumb {
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #fafbfd;
	border-radius: 6px;
	margin-bottom: 8px;
	overflow: hidden;
}
.thumb-img img {
	height: 32px;
	width: auto;
	display: block;
}
.thumb-color {
	gap: 10px;
}
.swatch {
	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 1px solid rgba(0, 0, 0, 0.08);
}
.sample {
	font-size: 15px;
	font-weight: 600;
}
.name {
	font-size: 14px;
	font-weight: 600;
	color: var(--el-text-color-primary);
	display: flex;
	align-items: center;
	gap: 6px;
}
.free-badge {
	font-size: 11px;
	font-weight: 500;
	color: var(--el-color-success);
	background: var(--el-color-success-light-9);
	border: 1px solid var(--el-color-success-light-7);
	border-radius: 4px;
	padding: 0 5px;
	line-height: 16px;
	white-space: nowrap;
}
.free-locked {
	font-size: 12px;
	color: var(--el-color-success);
	font-weight: 500;
}
.meta {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	margin: 2px 0 8px;
	word-break: break-all;
}
.controls {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}
.control {
	display: flex;
	align-items: center;
	gap: 4px;
}
.control label {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	white-space: nowrap;
}
.control-switch {
	margin-left: auto;
}
.grid-avatar {
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
.avatar-cell {
	padding: 8px;
}
.thumb-avatar img {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: block;
}
</style>
