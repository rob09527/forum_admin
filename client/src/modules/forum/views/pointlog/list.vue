<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<cl-flex1 />
			<!-- 搜索：ID / 类型 / 时间 / 用户名 -->
			<cl-search ref="Search" />
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
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-pointlog-list'
});

import { useCrud, useSearch, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { reactive } from 'vue';

const { service } = useCool();
const { t } = useI18n();

// 积分来源字典（对齐 forum server constants/business.ts PointType）
const options = reactive({
	type: [
		{ label: '签到', value: 'checkin', type: 'primary' },
		{ label: '发帖', value: 'post', type: 'success' },
		{ label: '评论', value: 'comment' },
		{ label: '被点赞', value: 'liked', type: 'warning' },
		{ label: '管理调整', value: 'transfer', type: 'danger' }
	]
});

// cl-table
const Table = useTable({
	columns: [
		{
			label: 'ID',
			prop: 'id',
			width: 70
		},
		{
			label: t('用户'),
			prop: 'userName',
			minWidth: 140
		},
		{
			label: t('类型'),
			prop: 'type',
			dict: options.type,
			width: 100
		},
		{
			label: t('变动'),
			prop: 'delta',
			width: 90,
			formatter: row => (row.delta > 0 ? `+${row.delta}` : String(row.delta))
		},
		{
			label: t('余额'),
			prop: 'balanceAfter',
			width: 90
		},
		{
			label: t('关联'),
			prop: 'refId',
			width: 80,
			formatter: row => (row.refId ? `#${row.refId}` : '—')
		},
		{
			label: t('时间'),
			prop: 'createdAt',
			minWidth: 170
		}
	]
});

// cl-search（ID 精确 / 类型 / 时间范围 / 用户名关键字）
const Search = useSearch({
	items: [
		{
			label: 'ID',
			prop: 'id',
			component: {
				name: 'el-input',
				props: { placeholder: 'ID', clearable: true },
				style: { width: '120px' }
			}
		},
		{
			label: t('类型'),
			prop: 'type',
			component: {
				name: 'cl-select',
				props: { options: options.type, refreshOnChange: false },
				style: { width: '150px' }
			}
		},
		{
			label: t('时间'),
			prop: 'createdAt',
			component: {
				name: 'cl-date-picker',
				props: { enableRefresh: false },
				style: { width: '360px' }
			}
		},
		{
			label: t('用户'),
			prop: 'keyWord',
			component: {
				name: 'el-input',
				props: { placeholder: t('搜索用户名'), clearable: true },
				style: { width: '180px' }
			}
		}
	],
	onSearch(data, { next }) {
		// datetimeRange 语义：createdAt 范围拆成 startCreatedAt / endCreatedAt（对齐后端 where）
		const [startCreatedAt, endCreatedAt] = data.createdAt || [];
		next({
			createdAt: undefined,
			id: data.id ? Number(data.id) : undefined,
			startCreatedAt,
			endCreatedAt
		});
	}
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.pointLog }, app => {
	app.refresh();
});
</script>
