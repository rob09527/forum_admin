<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<cl-flex1 />
			<!-- 搜索：用户名/渲染值关键字 + 有效期状态 -->
			<cl-search-key :placeholder="t('搜索用户名 / 颜色值 / 称号')" />
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-decoration-list'
});

import { useCrud, useSearch, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { reactive } from 'vue';

const { service } = useCool();
const { t } = useI18n();

// 类型字典（对齐 forum shop_items.type）
const options = reactive({
	type: [
		{ label: '用户名颜色', value: 'username_color', type: 'primary' },
		{ label: '称号', value: 'title', type: 'success' }
	],
	// 有效期状态（overdue 语义见后端 where 钩子：1=已过期 0=有效期内）
	overdue: [
		{ label: '全部', value: '' },
		{ label: '有效期内', value: '0', type: 'success' },
		{ label: '已过期', value: '1', type: 'danger' }
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
			label: t('用户名'),
			prop: 'userName',
			minWidth: 130
		},
		{
			label: t('类型'),
			prop: 'type',
			dict: options.type,
			width: 100
		},
		{
			label: t('渲染值'),
			prop: 'renderValue',
			minWidth: 150
		},
		{
			label: t('价格'),
			prop: 'price',
			width: 80
		},
		{
			label: t('开始时间'),
			prop: 'startAt',
			minWidth: 160
		},
		{
			label: t('到期时间'),
			prop: 'expireAt',
			minWidth: 160
		},
		{
			label: t('状态'),
			prop: 'status',
			width: 90,
			formatter: (row: any) => {
				const expired = row.expireAt && new Date(row.expireAt).getTime() < Date.now();
				return {
					text: expired ? t('已过期') : t('有效'),
					type: expired ? 'danger' : 'success'
				};
			}
		}
	]
});

// cl-search
const Search = useSearch({
	items: [
		{
			label: t('有效期'),
			prop: 'overdue',
			component: {
				name: 'cl-select',
				props: { options: options.overdue, refreshOnChange: false },
				style: { width: '130px' }
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
			label: t('用户ID'),
			prop: 'userId',
			component: {
				name: 'el-input-number',
				props: { placeholder: '用户ID', controls: false, style: 'width:130px' },
				style: { width: '130px' }
			}
		},
		{
			label: t('商品ID'),
			prop: 'itemId',
			component: {
				name: 'el-input-number',
				props: { placeholder: '商品ID', controls: false, style: 'width:130px' },
				style: { width: '130px' }
			}
		}
	]
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.decoration }, app => {
	app.refresh();
});
</script>
