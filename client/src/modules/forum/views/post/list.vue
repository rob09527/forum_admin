<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<cl-flex1 />
			<!-- 关键字搜索（标题/作者） -->
			<cl-search-key :placeholder="$t('搜索标题 / 作者')" />
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

		<!-- 帖子详情 + 评论 -->
		<el-dialog v-model="detailVisible" :title="detail.title || '查看帖子'" width="760px" top="6vh">
			<div v-if="detail.id" class="post-detail">
				<div class="detail-meta">
					<el-tag size="small">{{ categoryLabel(detail.category) }}</el-tag>
					<span class="meta-item">作者：{{ detail.authorName || '—' }}</span>
					<span class="meta-item">浏览 {{ detail.viewCount }} · 点赞 {{ detail.likeCount }} · 评论 {{ detail.commentCount }}</span>
					<span class="meta-item">{{ formatTime(detail.createdAt) }}</span>
				</div>

				<div class="detail-content">{{ detail.content || '（无正文）' }}</div>

				<el-divider content-position="left">评论（{{ flatComments.length }}）</el-divider>

				<div v-if="flatComments.length" class="comment-list">
					<div
						v-for="c in flatComments"
						:key="c.id"
						class="comment-item"
						:style="{ paddingLeft: c.depth * 16 + 'px' }"
					>
						<div class="comment-head">
							<span v-if="c.floor !== null" class="floor">#{{ c.floor }}</span>
							<span v-else class="floor">回复</span>
							<span class="author">{{ c.authorName || '匿名' }}</span>
							<span class="like">👍 {{ c.likeCount }}</span>
							<span class="time">{{ formatTime(c.createdAt) }}</span>
						</div>
						<div class="comment-content">{{ c.content }}</div>
					</div>
				</div>
				<el-empty v-else description="暂无评论" :image-size="60" />
			</div>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-post-list'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// 分类字典（对齐 forum server constants/business.ts CategoryLabel）
const options = reactive({
	category: [
		{ label: '综合讨论', value: 'general', type: 'primary' },
		{ label: '大模型', value: 'llm' },
		{ label: 'AI Agent', value: 'agent' },
		{ label: 'Prompt 工程', value: 'prompt' },
		{ label: 'AI 绘画', value: 'art' },
		{ label: '开源模型', value: 'opensource' },
		{ label: 'AI 工具', value: 'tools' },
		{ label: '论文解读', value: 'paper' },
		{ label: '经验分享', value: 'share' }
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
			label: t('标题'),
			prop: 'title',
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			label: t('作者'),
			prop: 'authorName',
			minWidth: 120
		},
		{
			label: t('分类'),
			prop: 'category',
			dict: options.category,
			minWidth: 100
		},
		{
			label: t('标签'),
			prop: 'tags',
			minWidth: 160,
			showOverflowTooltip: true,
			formatter: row => (Array.isArray(row.tags) ? row.tags.join('、') : row.tags || '')
		},
		{
			label: t('浏览'),
			prop: 'viewCount',
			width: 70
		},
		{
			label: t('点赞'),
			prop: 'likeCount',
			width: 70
		},
		{
			label: t('评论'),
			prop: 'commentCount',
			width: 70
		},
		{
			label: t('置顶'),
			prop: 'isPinned',
			width: 80,
			align: 'center',
			component: {
				name: 'cl-switch',
				api: params => service.forum.post.togglePin(params)
			}
		},
		{
			label: t('创建时间'),
			prop: 'createdAt',
			minWidth: 160
		},
		{
			type: 'op',
			width: 120,
			buttons: [
				{
					label: t('查看'),
					type: 'primary',
					onClick: ({ scope }) => openDetail(scope.row)
				},
				{
					label: t('删除'),
					type: 'danger',
					onClick: ({ scope }) => removePost(scope.row)
				}
			]
		}
	]
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.post }, app => {
	app.refresh();
});

// 帖子详情弹窗
const detailVisible = ref(false);
const detail = ref<Record<string, any>>({});
const flatComments = ref<any[]>([]);

// 打开帖子详情：列表行自带作者名（page join），正文/评论再按 id 拉取
async function openDetail(row: any) {
	detail.value = { ...row, content: null };
	flatComments.value = [];
	detailVisible.value = true;
	try {
		const [info, comments] = await Promise.all([
			service.forum.post.info({ id: row.id }),
			service.forum.post.comments({ id: row.id })
		]);
		detail.value.content = info?.content ?? '';
		flatComments.value = flattenComments(comments || []);
	} catch (err) {
		ElMessage.error('加载详情失败');
	}
}

// 递归树拍平成带缩进深度的列表，便于模板平铺渲染
function flattenComments(nodes: any[], depth = 0): any[] {
	const out: any[] = [];
	for (const n of nodes || []) {
		out.push({ ...n, depth });
		out.push(...flattenComments(n.replies || [], depth + 1));
	}
	return out;
}

function categoryLabel(value: string) {
	return options.category.find(o => o.value === value)?.label || value || '—';
}

function formatTime(iso: string) {
	if (!iso) return '—';
	const d = new Date(iso);
	return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

// 删除帖子（破坏性操作，二次确认）
function removePost(row: any) {
	ElMessageBox.confirm(
		`确定删除帖子「${row.title}」？将级联删除评论与点赞，且不可恢复。`,
		t('删除帖子'),
		{
			type: 'warning',
			confirmButtonText: t('删除'),
			cancelButtonText: t('取消'),
			confirmButtonClass: 'el-button--danger'
		}
	)
		.then(() => service.forum.post.deletePost({ id: row.id }))
		.then(() => {
			ElMessage.success('已删除');
			Crud.value?.refresh();
		})
		.catch(() => {});
}
</script>

<style scoped>
.post-detail {
	font-size: 14px;
}
.detail-meta {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
	color: var(--el-text-color-secondary);
}
.meta-item {
	font-size: 13px;
}
.detail-content {
	white-space: pre-wrap;
	word-break: break-word;
	line-height: 1.7;
	padding: 12px;
	background: var(--el-fill-color-light);
	border-radius: 6px;
	max-height: 260px;
	overflow-y: auto;
}
.comment-list {
	max-height: 320px;
	overflow-y: auto;
}
.comment-item {
	padding: 8px 0;
	border-bottom: 1px solid var(--el-border-color-lighter);
}
.comment-head {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13px;
	color: var(--el-text-color-secondary);
}
.comment-head .floor {
	color: var(--el-color-primary);
	font-weight: 600;
}
.comment-head .author {
	font-weight: 600;
	color: var(--el-text-color-primary);
}
.comment-content {
	margin-top: 4px;
	white-space: pre-wrap;
	word-break: break-word;
	line-height: 1.6;
	color: var(--el-text-color-primary);
}
</style>
