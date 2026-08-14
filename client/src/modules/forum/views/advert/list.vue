<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<!-- 新增 -->
			<el-button type="primary" @click="openAdd">新增广告</el-button>
			<cl-flex1 />
			<!-- 关键字搜索（标题） -->
			<cl-search-key :placeholder="$t('搜索标题')" />
		</cl-row>

		<cl-row>
			<!-- 位置筛选 -->
			<span class="filter-label">位置</span>
			<el-radio-group v-model="positionFilter" @change="onFilterChange">
				<el-radio-button value="">全部</el-radio-button>
				<el-radio-button value="sidebar">侧边栏</el-radio-button>
				<el-radio-button value="inline">列表内嵌</el-radio-button>
			</el-radio-group>
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增/编辑弹窗 -->
		<el-dialog v-model="formVisible" :title="isEdit ? '编辑广告' : '新增广告'" width="560px" top="10vh">
			<el-form label-width="90px">
				<el-form-item label="标题">
					<el-input v-model="form.title" placeholder="广告标题（选填，用于后台识别）" maxlength="100" show-word-limit />
				</el-form-item>

				<el-form-item label="banner 图">
					<div class="w-full">
						<cl-upload v-model="form.image" accept="image/*" />
						<div class="tip">上传 banner 图片，前台广告位按各自宽度等比缩放显示。</div>
					</div>
				</el-form-item>

				<el-form-item label="位置">
					<div class="w-full">
						<el-select v-model="form.position" style="width: 100%">
							<el-option v-for="(label, value) in POSITION_LABEL" :key="value" :label="label" :value="value" />
						</el-select>
						<div class="tip">{{ POSITION_SIZE_HINT[form.position] }}</div>
					</div>
				</el-form-item>

				<!-- 跳转方式：不跳转 / 站内 / 外链 -->
				<el-form-item label="跳转方式">
					<el-radio-group v-model="form.linkType">
						<el-radio-button value="none">不跳转</el-radio-button>
						<el-radio-button value="internal">站内</el-radio-button>
						<el-radio-button value="external">外链</el-radio-button>
					</el-radio-group>
				</el-form-item>

				<!-- 站内跳转：前缀选择（半选）+ 后缀填写（半填） -->
				<el-form-item v-if="form.linkType === 'internal'" label="站内路径">
					<div class="w-full">
						<el-select v-model="form.linkPrefix" style="width: 100%">
							<el-option v-for="o in INTERNAL_LINKS" :key="o.value" :label="o.label" :value="o.value">
								<span>{{ o.label }}</span>
								<span class="opt-path">{{ o.full }}</span>
							</el-option>
						</el-select>

						<!-- 需要填 ID 的：前缀固定 + 后缀填写 -->
						<el-input
							v-if="currentInternalKind === 'id'"
							v-model="form.linkSuffix"
							:placeholder="currentInternal.suffixPlaceholder"
							class="mt-8"
						>
							<template #prepend>{{ currentInternal.value }}</template>
						</el-input>

						<!-- 自定义路径：手填完整路径 -->
						<el-input
							v-else-if="currentInternalKind === 'custom'"
							v-model="form.linkSuffix"
							placeholder="完整路径，以 / 开头，如 /post/123"
							class="mt-8"
						/>

						<div class="tip">
							{{ currentInternal.hint }}
							<template v-if="linkPreview">最终跳转：<b>{{ linkPreview }}</b></template>
						</div>
					</div>
				</el-form-item>

				<!-- 外链跳转：网址填写 -->
				<el-form-item v-else-if="form.linkType === 'external'" label="外链地址">
					<div class="w-full">
						<el-input v-model="form.linkUrl" placeholder="www.baidu.com 或 https://baidu.com" />
						<div class="tip">
							裸域名会自动补 https://，例如填 www.baidu.com 会跳到 https://www.baidu.com。
							<template v-if="linkPreview">最终跳转：<b>{{ linkPreview }}</b></template>
						</div>
					</div>
				</el-form-item>

				<el-form-item label="排序">
					<el-input-number v-model="form.sortOrder" :min="0" :max="999" />
				</el-form-item>
				<el-form-item label="上线">
					<el-switch v-model="form.isActive" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="formVisible = false">取消</el-button>
				<el-button type="primary" @click="save">保存</el-button>
			</template>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-advert-list'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// 广告位置中文映射（与 forum server 的 AdvertPosition 对齐；top 已下线）
const POSITION_LABEL: Record<string, string> = {
	sidebar: '侧边栏',
	inline: '列表内嵌'
};

// 各位置推荐 banner 尺寸（后台填表时提示，业务前端按比例等比缩放）
const POSITION_SIZE_HINT: Record<string, string> = {
	sidebar: '推荐尺寸 300×250（宽高比 6:5），前台侧边栏展示',
	inline: '推荐尺寸 728×90（宽高比约 8:1），前台列表内嵌展示'
};

/**
 * 站内跳转前缀选项（半选择半填写：前缀下拉选，后缀手动填）。
 * kind: id=前缀固定需填 ID；fixed=完整路径无需后缀；custom=自定义完整路径。
 */
const INTERNAL_LINKS = [
	{ value: '/post/', label: '帖子详情', full: '/post/{帖子ID}', kind: 'id', suffixPlaceholder: '帖子 ID，如 123', hint: '填帖子 ID，例如 123 → 跳 /post/123。' },
	{ value: '/user/', label: '用户主页', full: '/user/{用户ID}', kind: 'id', suffixPlaceholder: '用户 ID，如 3', hint: '填用户 ID，例如 3 → 跳 /user/3。' },
	{ value: '/checkin', label: '签到页', full: '/checkin', kind: 'fixed', suffixPlaceholder: '', hint: '固定跳到签到页，无需填写。' },
	{ value: '/post/new', label: '发帖页', full: '/post/new', kind: 'fixed', suffixPlaceholder: '', hint: '固定跳到发帖页，无需填写。' },
	{ value: '/my/posts', label: '我的帖子', full: '/my/posts', kind: 'fixed', suffixPlaceholder: '', hint: '固定跳到我的帖子，无需填写。' },
	{ value: 'custom', label: '自定义路径', full: '/{自定义路径}', kind: 'custom', suffixPlaceholder: '', hint: '手动输入以 / 开头的完整站内路径。' }
] as const;

// cl-table
const Table = useTable({
	columns: [
		{
			label: 'ID',
			prop: 'id',
			width: 70
		},
		{
			label: t('标题'),
			prop: 'title',
			minWidth: 160,
			showOverflowTooltip: true,
			formatter: (row) => row.title || '—'
		},
		{
			label: t('位置'),
			prop: 'position',
			width: 100,
			formatter: (row) => POSITION_LABEL[row.position] || row.position
		},
		{
			label: t('图片'),
			prop: 'image',
			width: 120,
			component: {
				name: 'cl-image',
				props: { size: [40, 100] }
			}
		},
		{
			label: t('跳转链接'),
			prop: 'link',
			minWidth: 160,
			showOverflowTooltip: true,
			formatter: (row) => row.link || '—'
		},
		{
			label: t('排序'),
			prop: 'sortOrder',
			width: 80
		},
		{
			label: t('上线'),
			prop: 'isActive',
			width: 80,
			formatter: (row) => (row.isActive ? '是' : '否')
		},
		{
			label: t('创建时间'),
			prop: 'createdAt',
			minWidth: 160
		},
		{
			type: 'op',
			width: 150,
			buttons: [
				{
					label: t('编辑'),
					type: 'primary',
					onClick: ({ scope }) => openEdit(scope.row)
				},
				{
					label: t('删除'),
					type: 'danger',
					onClick: ({ scope }) => removeAdvert(scope.row)
				}
			]
		}
	]
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.advert }, (app) => {
	app.refresh();
});

// 位置筛选（空串 = 全部；merge 进 crud.params 作为持久查询条件）
const positionFilter = ref('');
function onFilterChange(value: string | number | boolean | undefined) {
	Crud.value?.refresh({ position: value ? String(value) : undefined });
}

// 新增/编辑弹窗
const formVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
	id: null as number | null,
	title: '',
	image: '',
	position: 'sidebar',
	linkType: 'none' as 'none' | 'internal' | 'external',
	linkPrefix: '/post/' as string,
	linkSuffix: '',
	linkUrl: '',
	sortOrder: 0,
	isActive: true
});

// 当前选中的站内前缀选项（用于决定显示哪种输入框 + 提示文案）
const currentInternal = computed(() => {
	return INTERNAL_LINKS.find((o) => o.value === form.linkPrefix) ?? INTERNAL_LINKS[0];
});
const currentInternalKind = computed(() => currentInternal.value.kind);

/** 根据表单状态拼出最终的 link 字段（保存与预览共用） */
function composeLink(): string | null {
	if (form.linkType === 'none') return null;
	if (form.linkType === 'external') {
		const url = form.linkUrl.trim();
		return url || null;
	}
	// 站内
	const opt = INTERNAL_LINKS.find((o) => o.value === form.linkPrefix);
	if (!opt) return null;
	if (opt.kind === 'fixed') return opt.value;
	const suffix = form.linkSuffix.trim();
	if (!suffix) return null;
	if (opt.kind === 'custom') return suffix.startsWith('/') ? suffix : `/${suffix}`;
	return opt.value + suffix; // kind === 'id'
}

/** 实时预览最终跳转地址 */
const linkPreview = computed(() => {
	if (form.linkType === 'none') return '';
	if (form.linkType === 'external') {
		const url = form.linkUrl.trim();
		if (!url) return '';
		return /^https?:\/\//i.test(url) || url.startsWith('//') ? url : `https://${url}`;
	}
	return composeLink() ?? '';
});

function openAdd() {
	isEdit.value = false;
	Object.assign(form, {
		id: null,
		title: '',
		image: '',
		position: 'sidebar',
		linkType: 'none',
		linkPrefix: '/post/',
		linkSuffix: '',
		linkUrl: '',
		sortOrder: 0,
		isActive: true
	});
	formVisible.value = true;
}

/** 把已存的 link 字符串拆回表单状态（半选择半填写的逆操作） */
function openEdit(row: any) {
	isEdit.value = true;
	const d = decomposeLink(row.link);
	Object.assign(form, {
		id: row.id,
		title: row.title ?? '',
		image: row.image ?? '',
		position: row.position ?? 'sidebar',
		linkType: d.linkType,
		linkPrefix: d.linkPrefix,
		linkSuffix: d.linkSuffix,
		linkUrl: d.linkUrl,
		sortOrder: row.sortOrder,
		isActive: row.isActive
	});
	formVisible.value = true;
}

function decomposeLink(link: string | null) {
	const none = { linkType: 'none' as const, linkPrefix: '/post/', linkSuffix: '', linkUrl: '' };
	if (!link) return none;
	if (link.startsWith('/')) {
		// 取最长匹配的前缀，避免 /post/ 抢先匹配到 /post/new（如 /post/new 应命中「发帖页」而非「帖子详情」）
		const matches = INTERNAL_LINKS.filter((o) => o.kind !== 'custom' && link.startsWith(o.value));
		const opt = [...matches].sort((a, b) => b.value.length - a.value.length)[0];
		if (opt) {
			return {
				linkType: 'internal' as const,
				linkPrefix: opt.value,
				linkSuffix: opt.kind === 'id' ? link.slice(opt.value.length) : '',
				linkUrl: ''
			};
		}
		// 无法识别的站内路径 → 走自定义
		return { linkType: 'internal' as const, linkPrefix: 'custom', linkSuffix: link, linkUrl: '' };
	}
	return { linkType: 'external' as const, linkPrefix: '/post/', linkSuffix: '', linkUrl: link };
}

// 保存（新增/编辑共用）
async function save() {
	if (!form.image) {
		ElMessage.warning('请上传 banner 图片');
		return;
	}
	// 站内选了需要填 ID 的，校验后缀非空
	if (form.linkType === 'internal') {
		const kind = currentInternalKind.value;
		if ((kind === 'id' || kind === 'custom') && !form.linkSuffix.trim()) {
			ElMessage.warning(kind === 'custom' ? '请填写自定义路径' : '请填写后缀');
			return;
		}
	}
	const payload = {
		title: form.title.trim() || null,
		image: form.image,
		position: form.position,
		link: composeLink(),
		sortOrder: form.sortOrder ?? 0,
		isActive: form.isActive
	};
	try {
		if (isEdit.value) {
			await service.forum.advert.update({ id: form.id, ...payload });
		} else {
			await service.forum.advert.add(payload);
		}
		ElMessage.success('已保存');
		formVisible.value = false;
		Crud.value?.refresh();
	} catch (err) {
		// 错误消息由请求层统一提示
	}
}

// 删除广告（破坏性操作，二次确认）
function removeAdvert(row: any) {
	ElMessageBox.confirm(`确定删除广告「${row.title || '无标题'}」？`, t('删除广告'), {
		type: 'warning',
		confirmButtonText: t('删除'),
		cancelButtonText: t('取消'),
		confirmButtonClass: 'el-button--danger'
	})
		.then(() => service.forum.advert.delete({ ids: [row.id] }))
		.then(() => {
			ElMessage.success('已删除');
			Crud.value?.refresh();
		})
		.catch(() => {});
}
</script>

<style lang="scss" scoped>
.w-full {
	width: 100%;
}
.mt-8 {
	margin-top: 8px;
}
.tip {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.5;
	margin-top: 4px;
}
.opt-path {
	float: right;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}
.filter-label {
	margin-right: 8px;
	font-size: 13px;
	color: var(--el-text-color-regular);
}
</style>
