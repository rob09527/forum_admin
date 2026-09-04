<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<cl-flex1 />
			<!-- 来源筛选（真实注册 / 导入影子用户 / 全部） -->
			<cl-search ref="Search" />
			<!-- 关键字搜索（用户名/邮箱） -->
			<cl-search-key :placeholder="$t('搜索用户名 / 邮箱')" />
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

		<!-- 行操作弹窗（修改角色 / 状态 / 调积分 / 重置密码） -->
		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-user-list'
});

import { useCrud, useSearch, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// 字典选项（对齐 forum schema：role/level/status）
const options = reactive({
	role: [
		{ label: '用户', value: 'user', type: 'info' },
		{ label: '版主', value: 'mod', type: 'warning' },
		{ label: '管理员', value: 'admin', type: 'danger' }
	],
	level: [
		{ label: '鸡爪', value: 'claw', type: 'info' },
		{ label: '鸡腿', value: 'leg', type: 'warning' },
		{ label: '鸡肉', value: 'meat', type: 'danger' }
	],
	status: [
		{ label: '正常', value: 'active', type: 'success' },
		{ label: '封禁', value: 'banned', type: 'danger' },
		{ label: '禁言', value: 'muted', type: 'warning' }
	],
	// 来源（users.isShadow）：导入的影子用户量级远大于真人，必须能筛掉才看得见真人
	// 值用 'true'/'false' 字符串，后端只认这两种取值，其余（含清空）视为「全部」
	source: [
		{ label: '真实用户', value: 'false', type: 'success' },
		{ label: '导入用户', value: 'true', type: 'info' }
	]
});

// cl-table
const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 50
		},
		{
			label: 'ID',
			prop: 'id',
			width: 70
		},
		{
			label: t('用户名'),
			prop: 'username',
			minWidth: 130
		},
		{
			label: t('邮箱'),
			prop: 'email',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			label: t('角色'),
			prop: 'role',
			dict: options.role,
			minWidth: 90
		},
		{
			label: t('等级'),
			prop: 'level',
			dict: options.level,
			minWidth: 90
		},
		{
			label: t('鸡腿'),
			prop: 'points',
			width: 80,
			sortable: true
		},
		{
			label: t('星辰'),
			prop: 'stars',
			width: 80
		},
		{
			label: t('发帖'),
			prop: 'postCount',
			width: 70
		},
		{
			label: t('评论'),
			prop: 'commentCount',
			width: 70
		},
		{
			label: t('关注'),
			prop: 'followingCount',
			width: 70
		},
		{
			label: t('粉丝'),
			prop: 'followerCount',
			width: 70
		},
		{
			label: t('状态'),
			prop: 'status',
			dict: options.status,
			minWidth: 90
		},
		{
			label: t('来源'),
			prop: 'isShadow',
			width: 90,
			// 后端返回的是真布尔，不能复用 options.source 的字符串 dict，直接格式化
			formatter: row => (row.isShadow ? t('导入') : t('真实'))
		},
		{
			label: t('注册时间'),
			prop: 'createdAt',
			sortable: 'desc',
			minWidth: 160
		},
		{
			type: 'op',
			width: 320,
			buttons: [
				{
					label: t('修改角色'),
					type: 'primary',
					onClick: ({ scope }) => openAction('role', scope.row)
				},
				{
					label: t('修改状态'),
					onClick: ({ scope }) => openAction('status', scope.row)
				},
				{
					label: t('调整积分'),
					onClick: ({ scope }) => openAction('points', scope.row)
				},
				{
					label: t('重置密码'),
					type: 'danger',
					onClick: ({ scope }) => openAction('password', scope.row)
				}
			]
		}
	]
});

// cl-search（来源筛选）
// 清空下拉时 next 显式传 undefined，避免空串被后端当有效取值
const Search = useSearch({
	items: [
		{
			label: t('来源'),
			prop: 'isShadow',
			component: {
				name: 'cl-select',
				props: { options: options.source, refreshOnChange: false },
				style: { width: '150px' }
			}
		}
	],
	onSearch(data, { next }) {
		next({ isShadow: data.isShadow || undefined });
	}
});

// cl-crud
// 第二个回调在组件挂载后触发，用于首次加载数据
const Crud = useCrud({ service: service.forum.user }, app => {
	app.refresh();
});

// ── 行操作弹窗（框架原生 cl-upsert） ──
type ActionType = 'role' | 'status' | 'points' | 'password';

const op = ref<ActionType>('role');
const currentRow = ref<any>(null);

// 每个操作对应的表单字段（修改角色 / 状态用中文下拉选择，不允许手动输入）
const ACTION_ITEMS: Record<ActionType, any[]> = {
	role: [
		{
			prop: 'role',
			label: '角色',
			component: { name: 'el-select', options: options.role },
			required: true
		}
	],
	status: [
		{
			prop: 'status',
			label: '状态',
			component: { name: 'el-select', options: options.status },
			required: true
		}
	],
	points: [
		{
			prop: 'delta',
			label: '调整积分',
			component: { name: 'el-input-number' },
			required: true
		}
	],
	password: [
		{
			prop: 'password',
			label: '新密码',
			component: { name: 'el-input', props: { type: 'password', showPassword: true } },
			required: true
		}
	]
};

const ACTION_TITLES: Record<ActionType, string> = {
	role: '修改角色',
	status: '修改状态',
	points: '调整积分',
	password: '重置密码'
};

const Upsert = useUpsert({
	items: ACTION_ITEMS.role,
	onSubmit: async (data, { done, close }) => {
		const row = currentRow.value;
		try {
			// 重置密码做最小长度校验
			if (op.value === 'password' && (data.password || '').length < 8) {
				ElMessage.warning('密码至少 8 位');
				done();
				return;
			}

			switch (op.value) {
				case 'role':
					await service.forum.user.changeRole({ id: row.id, role: data.role });
					break;
				case 'status':
					await service.forum.user.changeStatus({ id: row.id, status: data.status });
					break;
				case 'points':
					await service.forum.user.adjustPoints({ id: row.id, delta: data.delta });
					break;
				case 'password':
					await service.forum.user.resetPassword({ id: row.id, password: data.password });
					break;
			}

			ElMessage.success('操作成功');
			Crud.value?.refresh();
			close();
		} catch (e: any) {
			showError(e, '操作失败');
		} finally {
			done();
		}
	}
});

// 打开指定操作弹窗
async function openAction(type: ActionType, row: any) {
	op.value = type;
	currentRow.value = row;
	Upsert.value.config.items = ACTION_ITEMS[type];
	await Upsert.value.append({ role: row.role, status: row.status, delta: 0, password: '' });
	Upsert.value.setTitle(ACTION_TITLES[type]);
}
</script>
