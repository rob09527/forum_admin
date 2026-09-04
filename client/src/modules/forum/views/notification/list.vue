<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<!-- 群发系统通知 -->
			<el-button type="primary" @click="openBroadcast">📢 群发系统通知</el-button>
			<cl-flex1 />
			<!-- 关键字搜索（接收者用户名） -->
			<cl-search-key :placeholder="$t('搜索接收者用户名')" />
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

		<!-- 群发系统通知弹窗 -->
		<el-dialog v-model="broadcastVisible" title="📢 群发系统通知" width="560px" top="8vh">
			<el-form label-width="90px">
				<el-form-item label="接收范围">
					<el-radio-group v-model="form.target">
						<el-radio-button value="all">全站用户</el-radio-button>
						<el-radio-button value="role">按角色</el-radio-button>
						<el-radio-button value="users">指定用户</el-radio-button>
					</el-radio-group>
				</el-form-item>

				<el-form-item v-if="form.target === 'role'" label="角色">
					<el-select v-model="form.role" style="width: 100%">
						<el-option v-for="(label, value) in ROLE_LABEL" :key="value" :label="label" :value="value" />
					</el-select>
				</el-form-item>

				<el-form-item v-if="form.target === 'users'" label="用户 ID">
					<el-input
						v-model="form.userIds"
						type="textarea"
						:rows="3"
						placeholder="填写用户 ID，逗号分隔，如 3,5,12"
					/>
				</el-form-item>

				<el-form-item label="通知内容">
					<el-input
						v-model="form.content"
						type="textarea"
						:rows="4"
						maxlength="2000"
						show-word-limit
						placeholder="系统通知正文，如「论坛将于今晚 23:00 停机维护」"
					/>
				</el-form-item>

				<el-form-item label="跳转帖子">
					<el-input-number v-model="form.postId" :min="1" :controls="false" placeholder="可留空" style="width: 100%" />
					<div class="tip">可选：填帖子 ID 后，用户点通知会跳到对应帖子。</div>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="broadcastVisible = false">取消</el-button>
				<el-button type="primary" :loading="sending" @click="sendBroadcast">发送</el-button>
			</template>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-notification-list'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// 通知类型中文映射（与 forum server 的 NotificationType 对齐）
const TYPE_LABEL: Record<string, string> = {
	comment: '评论',
	reply: '回复',
	like: '点赞',
	follow: '关注',
	system: '系统'
};

// 角色中文映射
const ROLE_LABEL: Record<string, string> = {
	user: '用户',
	mod: '版主',
	admin: '管理员'
};

// cl-table
const Table = useTable({
	columns: [
		{
			label: 'ID',
			prop: 'id',
			width: 70
		},
		{
			label: t('接收者'),
			// 后端用别名 b.username as "userName"，避免与 notifications 表的列同名碰撞
			prop: 'userName',
			minWidth: 120
		},
		{
			label: t('类型'),
			prop: 'type',
			width: 90,
			formatter: (row) => TYPE_LABEL[row.type] || row.type
		},
		{
			label: t('触发者'),
			prop: 'actorIds',
			width: 110,
			showOverflowTooltip: true,
			formatter: (row) => (Array.isArray(row.actorIds) && row.actorIds.length ? row.actorIds.join('、') : '—')
		},
		{
			label: t('内容 / 文案'),
			prop: 'content',
			minWidth: 240,
			showOverflowTooltip: true,
			formatter: (row) => row.content || `—（${TYPE_LABEL[row.type] || row.type}）`
		},
		{
			label: t('关联帖子'),
			prop: 'postId',
			width: 90,
			formatter: (row) => (row.postId ? `#${row.postId}` : '—')
		},
		{
			label: t('已读'),
			prop: 'isRead',
			width: 80,
			formatter: (row) => (row.isRead ? '已读' : '未读')
		},
		{
			label: t('发送时间'),
			prop: 'createdAt',
			minWidth: 160
		},
		{
			type: 'op',
			width: 120,
			buttons: [
				{
					label: t('删除'),
					type: 'danger',
					onClick: ({ scope }) => removeNotification(scope.row)
				}
			]
		}
	]
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.notification }, (app) => {
	app.refresh();
});

// ── 群发系统通知 ──
const broadcastVisible = ref(false);
const sending = ref(false);
const form = reactive({
	target: 'all' as 'all' | 'role' | 'users',
	role: 'user',
	userIds: '',
	content: '',
	postId: null as number | null
});

function openBroadcast() {
	Object.assign(form, {
		target: 'all',
		role: 'user',
		userIds: '',
		content: '',
		postId: null
	});
	broadcastVisible.value = true;
}

async function sendBroadcast() {
	if (!form.content.trim()) {
		ElMessage.warning('请填写通知内容');
		return;
	}
	if (form.target === 'users') {
		const ids = parseUserIds(form.userIds);
		if (!ids.length) {
			ElMessage.warning('请填写至少一个用户 ID');
			return;
		}
		sending.value = true;
		try {
			const res = await service.forum.notification.broadcast({
				target: form.target,
				userIds: ids,
				content: form.content.trim(),
				postId: form.postId ?? null
			});
			ElMessage.success(`已发送给 ${res?.count ?? 0} 个用户`);
			broadcastVisible.value = false;
			Crud.value?.refresh();
		} catch (err) {
			showError(err, '发送失败');
		} finally {
			sending.value = false;
		}
		return;
	}
	sending.value = true;
	try {
		const res = await service.forum.notification.broadcast({
			target: form.target,
			...(form.target === 'role' ? { role: form.role } : {}),
			content: form.content.trim(),
			postId: form.postId ?? null
		});
		ElMessage.success(`已发送给 ${res?.count ?? 0} 个用户`);
		broadcastVisible.value = false;
		Crud.value?.refresh();
	} catch (err) {
		showError(err, '发送失败');
	} finally {
		sending.value = false;
	}
}

/** 解析逗号分隔的用户 ID 输入，过滤非法项 */
function parseUserIds(input: string): number[] {
	return input
		.split(/[,，\s]+/)
		.map((s) => Number(s.trim()))
		.filter((n) => Number.isInteger(n) && n > 0);
}

// 删除通知（破坏性操作，二次确认）
function removeNotification(row: any) {
	ElMessageBox.confirm(`确定删除「#${row.id}」这条通知？`, t('删除通知'), {
		type: 'warning',
		confirmButtonText: t('删除'),
		cancelButtonText: t('取消'),
		confirmButtonClass: 'el-button--danger'
	})
		.then(() => service.forum.notification.delete({ ids: [row.id] }))
		.then(() => {
			ElMessage.success('已删除');
			Crud.value?.refresh();
		})
		.catch((err) => {
			// 确认框取消（'cancel'/'close'）静默，真实请求失败才提示
			if (err === 'cancel' || err === 'close') return;
			showError(err, '删除失败');
		});
}
</script>

<style lang="scss" scoped>
.tip {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.5;
	margin-top: 4px;
}
</style>
