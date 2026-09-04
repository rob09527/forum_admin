<template>
	<el-scrollbar>
		<div class="nodeloc-page">
			<!-- 顶部：worker 开关（热切换）+ 阶段徽章 -->
			<el-card shadow="never" class="mb-3">
				<div class="flex items-center justify-between flex-wrap gap-3">
					<div class="flex items-center gap-3">
						<span class="font-semibold">NodeLoc 数据导入</span>
						<el-tag :type="phaseTagType" size="small">{{ phaseLabel }}</el-tag>
						<el-tag v-if="overview?.syncEnabled" type="success" size="small" effect="plain">同步中</el-tag>
						<el-tag v-else type="info" size="small" effect="plain">已暂停</el-tag>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm text-zinc-500">同步 worker 开关</span>
						<el-switch
							v-model="syncEnabled"
							v-permission="service.forum.nodeloc.permission.setSyncEnabled"
							:loading="savingToggle"
							@change="toggleSync"
						/>
					</div>
				</div>
				<div class="form-tip mt-2">
					热切换：点击开关即时写入 forum 配置（无需重启容器），60s 调度器下一轮生效。关闭后增量同步/回灌/造数全部暂停。
				</div>
			</el-card>

			<!-- 只读监控：三阶段状态 -->
			<el-card shadow="never" class="mb-3">
				<template #header>
					<span>📡 同步状态（只读）</span>
				</template>
				<el-row :gutter="16">
					<el-col :xs="12" :md="8" :xl="4">
						<div class="stat-label">当前阶段</div>
						<div class="stat-value">{{ phaseLabel }}</div>
						<div class="stat-sub">回填 → 造数 → 增量</div>
					</el-col>
					<el-col :xs="12" :md="8" :xl="4">
						<div class="stat-label">增量游标</div>
						<div class="stat-value font-mono">{{ overview?.cursor ?? '—' }}</div>
						<div class="stat-sub">已同步到的对方最大 post id</div>
					</el-col>
					<el-col :xs="12" :md="8" :xl="4">
						<div class="stat-label">回填页游标</div>
						<div class="stat-value font-mono">{{ overview?.backfillPage ?? '—' }}</div>
						<div class="stat-sub">回填阶段翻到第几页</div>
					</el-col>
				</el-row>
			</el-card>

			<!-- 只读监控：数据规模 -->
			<el-card shadow="never" class="mb-3">
				<template #header>
					<span>📊 数据规模（只读）</span>
				</template>
				<el-row :gutter="16">
					<el-col :xs="12" :md="8" :xl="4" v-for="item in statCards" :key="item.label">
						<div class="stat-label">{{ item.label }}</div>
						<div class="stat-value">{{ fmt(item.value) }}</div>
						<div class="stat-sub">{{ item.sub }}</div>
					</el-col>
				</el-row>
			</el-card>

			<!-- 安全调控 -->
			<el-card shadow="never">
				<template #header>
					<span>🛠️ 安全调控</span>
					<span class="chart-sub">危险操作（清空重 0 / 切阶段 / 推游标）不在页面，仍走 CLI</span>
				</template>

				<div class="mb-4">
					<div class="font-semibold mb-2">单主题重灌</div>
					<div class="flex items-center gap-2">
						<el-input
							v-model="reimportId"
							placeholder="输入 NodeLoc 主题 ID"
							style="max-width: 260px"
							clearable
							@keyup.enter="doReimport"
						/>
						<el-button
							type="primary"
							v-permission="service.forum.nodeloc.permission.reimportTopic"
							:loading="reimporting"
							@click="doReimport"
						>
							重灌该主题
						</el-button>
					</div>
					<div class="form-tip mt-1">幂等：已导入主题返回 skipped，重新拉取全量楼层补齐缺失评论。</div>
				</div>

				<div>
					<div class="font-semibold mb-2">重建搜索索引</div>
					<div class="flex items-center gap-2">
						<el-button
							type="warning"
							v-permission="service.forum.nodeloc.permission.reindex"
							:loading="reindexing"
							@click="doReindex"
						>
							全量重建索引
						</el-button>
						<span v-if="reindexResult != null" class="text-sm text-zinc-600">上次重建写入 {{ fmt(reindexResult) }} 篇</span>
					</div>
					<div class="form-tip mt-1">
						回填阶段只写 DB 不写搜索索引，回填<b>完成后</b>执行本操作，否则回灌内容列表可见但搜索搜不到。
					</div>
				</div>
			</el-card>
		</div>
	</el-scrollbar>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-nodeloc-index'
});

import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';

const { service } = useCool();

/** 阶段中文名与徽章色（与 forum 侧 import 三阶段一致） */
const PHASE_MAP: Record<string, { label: string; type: 'success' | 'warning' | 'primary' | 'info' }> = {
	backfill: { label: '回填', type: 'warning' },
	fabricate: { label: '造数', type: 'primary' },
	incremental: { label: '增量', type: 'success' }
};

const overview = ref<any>(null);
const syncEnabled = ref(false);
const savingToggle = ref(false);
const reimportId = ref('');
const reimporting = ref(false);
const reindexing = ref(false);
const reindexResult = ref<number | null>(null);

const phaseLabel = computed(() => {
	const phase = overview.value?.phase;
	if (!phase) return '未启动';
	return PHASE_MAP[phase]?.label ?? phase;
});
const phaseTagType = computed(() => (PHASE_MAP[overview.value?.phase]?.type ?? 'info') as any);

const statCards = computed(() => {
	const s = overview.value?.stats || {};
	return [
		{ label: '帖子映射', value: s.postMappings ?? 0, sub: 'import_mappings 本地帖子' },
		{ label: '评论映射', value: s.commentMappings ?? 0, sub: 'import_mappings 本地评论' },
		{ label: '孤立映射', value: s.orphanMappings ?? 0, sub: '两侧皆空（删除审计痕迹）' },
		{ label: '影子账号', value: s.shadowUsers ?? 0, sub: 'isShadow=true 不可登录' },
		{ label: '占位账号', value: s.placeholderUsers ?? 0, sub: 'sourceUserId<0，应恒为 1' },
		{ label: '影子帖子', value: s.shadowPosts ?? 0, sub: '作者为影子账号' },
		{ label: '影子评论', value: s.shadowComments ?? 0, sub: '作者为影子账号' },
		{ label: '影子关注', value: s.shadowFollows ?? 0, sub: '造数产物' },
		{ label: '影子积分流水', value: s.shadowPointLogs ?? 0, sub: '回灌 + 造数产物' }
	];
});

function fmt(n: number): string {
	return (n ?? 0).toLocaleString('zh-CN');
}

onMounted(async () => {
	try {
		const data: any = await service.forum.nodeloc.getOverview();
		overview.value = data;
		syncEnabled.value = !!data?.syncEnabled;
	} catch (err) {
		console.error('[nodeloc] 加载概览失败:', err);
	}
});

async function toggleSync(val: boolean) {
	savingToggle.value = true;
	try {
		await service.forum.nodeloc.setSyncEnabled({ syncEnabled: val });
		ElMessage.success(val ? '已开启同步 worker' : '已暂停同步 worker');
		if (overview.value) overview.value.syncEnabled = val;
	} catch (err: any) {
		syncEnabled.value = !val;
		showError(err, '切换失败');
	} finally {
		savingToggle.value = false;
	}
}

async function doReimport() {
	const topicId = Number(reimportId.value);
	if (!Number.isInteger(topicId) || topicId <= 0) {
		ElMessage.warning('请输入有效的主题 ID');
		return;
	}
	reimporting.value = true;
	try {
		const res: any = await service.forum.nodeloc.reimportTopic({ topicId });
		ElMessage.success(res?.status === 'skipped' ? '该主题已导入，跳过' : '重灌完成');
		load();
	} catch (err: any) {
		showError(err, '重灌失败');
	} finally {
		reimporting.value = false;
	}
}

async function doReindex() {
	await ElMessageBox.confirm('全量重建搜索索引，上万帖时耗时较长（几十秒）。确定执行？', '重建索引', {
		type: 'warning',
		confirmButtonText: '重建',
		cancelButtonText: '取消'
	});
	reindexing.value = true;
	try {
		const res: any = await service.forum.nodeloc.reindex();
		reindexResult.value = res?.count ?? 0;
		ElMessage.success(`重建完成，写入 ${fmt(reindexResult.value)} 篇`);
	} catch (err: any) {
		if (err === 'cancel' || err === 'close') return;
		showError(err, '重建失败');
	} finally {
		reindexing.value = false;
	}
}

/** 重新拉取概览（重灌后规模/游标可能变化） */
async function load() {
	try {
		const data: any = await service.forum.nodeloc.getOverview();
		overview.value = data;
		syncEnabled.value = !!data?.syncEnabled;
	} catch (err) {
		console.error('[nodeloc] 刷新概览失败:', err);
	}
}
</script>

<style scoped>
.mb-3 {
	margin-bottom: 16px;
}
.stat-label {
	font-size: 13px;
	color: var(--el-text-color-secondary);
}
.stat-value {
	font-size: 24px;
	font-weight: 600;
	margin: 6px 0;
	color: var(--el-text-color-primary);
}
.stat-sub {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.4;
	margin-bottom: 14px;
}
.chart-sub {
	margin-left: 10px;
	font-size: 12px;
	font-weight: normal;
	color: var(--el-text-color-secondary);
}
.form-tip {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.4;
	margin-top: 2px;
}
.font-mono {
	font-family: var(--el-font-family-mono, monospace);
}
</style>
