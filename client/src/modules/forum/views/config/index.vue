<template>
	<div class="config-page">
		<!-- 签到奖励 -->
		<el-card class="mb-4" shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🍗 签到奖励</span>
					<el-button type="primary" size="small" :loading="savingCheckin" @click="saveCheckin">
						保存签到配置
					</el-button>
				</div>
			</template>
			<el-form label-width="160px" label-position="left">
				<el-row :gutter="24">
					<el-col :xs="24" :md="12">
						<el-form-item label="每日基础分">
							<el-input-number v-model="checkin.base" :min="0" :step="1" />
							<div class="form-tip">每日签到固定 +X 鸡腿</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="连签每日加成">
							<el-input-number v-model="checkin.streakBonusPerDay" :min="0" :step="1" />
							<div class="form-tip">连签第 N 天额外 +N×加成</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="连签加成上限">
							<el-input-number v-model="checkin.streakBonusCap" :min="0" :step="1" />
							<div class="form-tip">连签加成不超过该值</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="里程碑间隔天数">
							<el-input-number v-model="checkin.milestoneEvery" :min="1" :step="1" />
							<div class="form-tip">连签每满该天数奖励一次（如 7 → 第 7/14/21… 天）</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="里程碑奖励">
							<el-input-number v-model="checkin.milestoneBonus" :min="0" :step="1" />
							<div class="form-tip">里程碑当天额外奖励</div>
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
		</el-card>

		<!-- 等级体系 -->
		<el-card shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🐔 等级体系</span>
					<div>
						<el-button size="small" @click="addLevel">添加等级</el-button>
						<el-button type="primary" size="small" :loading="savingLevels" @click="saveLevels">
							保存等级配置
						</el-button>
					</div>
				</div>
			</template>
			<el-table :data="levels" border size="small">
				<el-table-column label="等级标识 (key)" min-width="170">
					<template #default="{ row }">
						<el-input v-model="row.key" placeholder="如 claw" />
					</template>
				</el-table-column>
				<el-table-column label="中文名" min-width="140">
					<template #default="{ row }">
						<el-input v-model="row.name" placeholder="如 鸡爪" />
					</template>
				</el-table-column>
				<el-table-column label="门槛（累计鸡腿）" min-width="170">
					<template #default="{ row }">
						<el-input-number v-model="row.minTotal" :min="0" :step="1" />
					</template>
				</el-table-column>
				<el-table-column label="操作" width="90" align="center">
					<template #default="{ $index }">
						<el-button type="danger" link @click="removeLevel($index)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="form-tip mt-2">
				规则：key 唯一且非空；必须恰好一个门槛为 0 的起始等级；保存时自动按门槛降序。
				未配置时论坛端使用默认值（基础分 5 / 连签加成 1 / 上限 5 / 里程碑 7 天 +30；鸡爪≥0 / 鸡腿≥100 / 鸡肉≥500）。
			</div>
		</el-card>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-config-index'
});

import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';

const { service } = useCool();

/** 默认签到配置（与 forum server 的 DEFAULT_CHECKIN_CONFIG 保持一致） */
const DEFAULT_CHECKIN = {
	base: 5,
	streakBonusPerDay: 1,
	streakBonusCap: 5,
	milestoneEvery: 7,
	milestoneBonus: 30
};

/** 默认等级（与 forum server 的 DEFAULT_LEVELS 保持一致） */
const DEFAULT_LEVELS = [
	{ key: 'meat', name: '鸡肉', minTotal: 500 },
	{ key: 'leg', name: '鸡腿', minTotal: 100 },
	{ key: 'claw', name: '鸡爪', minTotal: 0 }
];

const checkin = reactive({ ...DEFAULT_CHECKIN });
const levels = ref<{ key: string; name: string; minTotal: number }[]>(DEFAULT_LEVELS.map((l) => ({ ...l })));

const savingCheckin = ref(false);
const savingLevels = ref(false);

onMounted(async () => {
	try {
		const data: any = await service.forum.config.getConfig();
		if (data?.checkin) Object.assign(checkin, data.checkin);
		if (Array.isArray(data?.levels) && data.levels.length) {
			levels.value = data.levels.map((l: any) => ({ key: l.key, name: l.name, minTotal: l.minTotal }));
		}
	} catch (err) {
		// 读取失败由请求层提示，保持默认值
		console.error('[config] 读取配置失败:', err);
	}
});

async function saveCheckin() {
	savingCheckin.value = true;
	try {
		await service.forum.config.saveCheckin({ ...checkin });
		ElMessage.success('签到配置已保存');
	} catch (err: any) {
		// 后端业务错误（如校验不通过）由请求层静默 reject，这里统一提示
		showError(err, '保存失败');
		console.error('[config] 保存签到配置失败:', err);
	} finally {
		savingCheckin.value = false;
	}
}

async function saveLevels() {
	savingLevels.value = true;
	try {
		// 发送前按门槛降序（高的在前），与论坛端校验一致
		const sorted = [...levels.value].sort((a, b) => b.minTotal - a.minTotal);
		await service.forum.config.saveLevels(sorted);
		levels.value = sorted;
		ElMessage.success('等级配置已保存');
	} catch (err: any) {
		// 后端业务错误（如校验不通过）由请求层静默 reject，这里统一提示
		showError(err, '保存失败');
		console.error('[config] 保存等级配置失败:', err);
	} finally {
		savingLevels.value = false;
	}
}

function addLevel() {
	levels.value.push({ key: '', name: '', minTotal: 0 });
}

function removeLevel(index: number) {
	levels.value.splice(index, 1);
}
</script>

<style scoped>
.form-tip {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	line-height: 1.4;
	margin-top: 2px;
}
</style>
