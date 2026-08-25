<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<!-- 立即结算到期悬赏（人工兜底 [2.4]） -->
			<el-button
				v-permission="service.forum.bounty.permission.sweep"
				type="warning"
				:loading="sweeping"
				@click="sweep"
			>
				立即结算到期悬赏
			</el-button>
			<cl-flex1 />
			<!-- 搜索：状态 / 时间范围 -->
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
	name: 'forum-bounty-list'
});

import { useCrud, useSearch, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// 状态字典（对齐 forum schema）
const options = reactive({
	status: [
		{ label: '托管中', value: 'escrow', type: 'warning' },
		{ label: '已结算', value: 'settled', type: 'success' },
		{ label: '已退款', value: 'refunded', type: 'info' }
	],
	settleType: [
		{ label: '采纳结算', value: 'accept', type: 'success' },
		{ label: '到期自动', value: 'auto', type: 'primary' },
		{ label: '取消退款', value: 'cancel', type: 'info' },
		{ label: '管理员处置', value: 'admin', type: 'danger' }
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
			label: t('发起人'),
			prop: 'userName',
			minWidth: 120
		},
		{
			label: t('帖子'),
			prop: 'postId',
			width: 80,
			formatter: row => (row.postId ? `#${row.postId}` : '—')
		},
		{
			label: t('悬赏金额'),
			prop: 'amount',
			width: 100
		},
		{
			label: t('状态'),
			prop: 'status',
			dict: options.status,
			width: 90
		},
		{
			label: t('到期时间'),
			prop: 'expireAt',
			minWidth: 160
		},
		{
			label: t('被采纳者'),
			prop: 'acceptedUserName',
			minWidth: 120,
			formatter: row => row.acceptedUserName || '—'
		},
		{
			label: t('实付'),
			prop: 'payout',
			width: 80,
			formatter: row => row.payout ?? '—'
		},
		{
			label: t('手续费'),
			prop: 'fee',
			width: 80,
			formatter: row => row.fee ?? '—'
		},
		{
			label: t('结算方式'),
			prop: 'settleType',
			dict: options.settleType,
			width: 100,
			formatter: row => row.settleType || '—'
		},
		{
			label: t('结算时间'),
			prop: 'settledAt',
			minWidth: 160,
			formatter: row => row.settledAt || '—'
		},
		{
			label: t('操作人'),
			prop: 'operator',
			width: 110,
			formatter: row => row.operator || '—'
		},
		{
			type: 'op',
			width: 110,
			// 函数形式：每行按状态 + 权限计算可见性（hidden 仅支持布尔）
			buttons: ({ scope }) => [
				{
					label: t('人工退款'),
					type: 'danger',
					hidden: !service.forum.bounty._permission.refund || scope.row.status !== 'escrow',
					onClick: ({ scope }) => refund(scope.row)
				}
			]
		}
	]
});

// cl-search（状态 + 创建时间范围）
const Search = useSearch({
	items: [
		{
			label: t('状态'),
			prop: 'status',
			component: {
				name: 'cl-select',
				props: { options: options.status, refreshOnChange: false },
				style: { width: '130px' }
			}
		},
		{
			label: t('创建时间'),
			prop: 'createdAt',
			component: {
				name: 'cl-date-picker',
				props: { enableRefresh: false },
				style: { width: '360px' }
			}
		}
	],
	onSearch(data, { next }) {
		const [startCreatedAt, endCreatedAt] = data.createdAt || [];
		next({
			createdAt: undefined,
			status: data.status,
			startCreatedAt,
			endCreatedAt
		});
	}
});

// cl-crud
const Crud = useCrud({ service: service.forum.bounty }, app => {
	app.refresh();
});

// ── 人工退款（仅托管中可退，转发 forum server 做账务写 [2.4]） ──
function refund(row: any) {
	ElMessageBox.confirm(
		t('确定对悬赏 #{id}（金额 {amount}）执行人工退款？将全额退回发起人。', {
			id: row.id,
			amount: row.amount
		}),
		t('人工退款'),
		{
			type: 'warning',
			confirmButtonText: t('退款'),
			cancelButtonText: t('取消'),
			confirmButtonClass: 'el-button--danger'
		}
	)
		.then(() => service.forum.bounty.refund({ id: row.id }))
		.then(() => {
			ElMessage.success(t('退款成功'));
			Crud.value?.refresh();
		})
		.catch((err: any) => {
			if (err === 'cancel' || err === 'close') return;
			showError(err, t('退款失败'));
		});
}

// ── 立即结算所有到期悬赏（调度器异常时的补充兜底） ──
const sweeping = ref(false);

function sweep() {
	ElMessageBox.confirm(t('将立即结算所有已到期的托管中悬赏，确认执行？'), t('立即结算'), {
		type: 'warning',
		confirmButtonText: t('执行'),
		cancelButtonText: t('取消')
	})
		.then(() => {
			sweeping.value = true;
			return service.forum.bounty.sweep().finally(() => {
				sweeping.value = false;
			});
		})
		.then((res: any) => {
			ElMessage.success(t('已结算 {n} 笔', { n: res?.settled ?? 0 }));
			Crud.value?.refresh();
		})
		.catch((err: any) => {
			if (err === 'cancel' || err === 'close') return;
			showError(err, t('结算失败'));
		});
}
</script>
