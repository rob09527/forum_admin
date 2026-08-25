<template>
	<el-scrollbar>
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

		<!-- 商城配置 -->
		<el-card v-permission="service.forum.config.permission.saveShop" class="mt-3" shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🛍️ 商城配置</span>
					<div>
						<el-button size="small" v-permission="service.forum.config.permission.reset" @click="resetGroup('shop')">
							恢复默认
						</el-button>
						<el-button type="primary" size="small" :loading="savingShop" @click="saveShop">保存商城配置</el-button>
					</div>
				</div>
			</template>
			<el-form label-width="180px" label-position="left">
				<el-row :gutter="24">
					<el-col :xs="24" :md="12">
						<el-form-item label="默认时效（天）">
							<el-input-number v-model="shop.defaultDurationDays" :min="1" :step="1" />
							<div class="form-tip">购买装饰的默认有效期天数</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="到期提醒提前（天）">
							<el-input-number v-model="shop.remindDays" :min="0" :step="1" />
							<div class="form-tip">到期前 N 天发提醒通知</div>
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
		</el-card>

		<!-- 打赏配置 -->
		<el-card v-permission="service.forum.config.permission.saveTip" class="mt-3" shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🧧 打赏配置</span>
					<div>
						<el-button size="small" v-permission="service.forum.config.permission.reset" @click="resetGroup('tip')">
							恢复默认
						</el-button>
						<el-button type="primary" size="small" :loading="savingTip" @click="saveTip">保存打赏配置</el-button>
					</div>
				</div>
			</template>
			<el-form label-width="180px" label-position="left">
				<el-row :gutter="24">
					<el-col :xs="24" :md="12">
						<el-form-item label="快捷档位">
							<el-select
								v-model="tip.amounts"
								multiple
								filterable
								allow-create
								default-first-option
								:reserve-keyword="false"
								placeholder="输入金额回车添加"
								style="width: 100%"
							/>
							<div class="form-tip">可选打赏档位（整数鸡腿），如 6 / 66 / 188</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="自定义金额下限">
							<el-input-number v-model="tip.customMin" :min="1" :step="1" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="自定义金额上限">
							<el-input-number v-model="tip.customMax" :min="1" :step="1" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="单用户日打赏上限">
							<el-input-number v-model="tip.dailyLimitPerUser" :min="1" :step="1" :disabled="!tip.dailyLimitPerUser" />
							<el-checkbox v-model="tip._noLimit" class="ml-1">不限制</el-checkbox>
							<div class="form-tip">为空 = 不限制</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="热度加成基数">
							<el-input-number v-model="tip.heatBase" :min="0" :step="100" />
							<div class="form-tip">打赏对帖子的热度贡献基数</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="热度加成上限">
							<el-input-number v-model="tip.heatCap" :min="0" :step="100" />
							<div class="form-tip">打赏热度贡献封顶</div>
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
		</el-card>

		<!-- 悬赏配置 -->
		<el-card v-permission="service.forum.config.permission.saveBounty" class="mt-3" shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🎯 悬赏配置</span>
					<div>
						<el-button size="small" v-permission="service.forum.config.permission.reset" @click="resetGroup('bounty')">
							恢复默认
						</el-button>
						<el-button type="primary" size="small" :loading="savingBounty" @click="saveBounty">保存悬赏配置</el-button>
					</div>
				</div>
			</template>
			<el-form label-width="180px" label-position="left">
				<el-row :gutter="24">
					<el-col :xs="24" :md="12">
						<el-form-item label="手续费率">
							<el-input-number v-model="bounty.feeRate" :min="0" :max="1" :step="0.05" :precision="2" />
							<div class="form-tip">结算时平台抽取比例，如 0.1 = 10%</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="超时天数">
							<el-input-number v-model="bounty.timeoutDays" :min="1" :step="1" />
							<div class="form-tip">超过该天数未采纳则自动结算/退款</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="悬赏金额下限">
							<el-input-number v-model="bounty.amountMin" :min="1" :step="10" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="悬赏金额上限">
							<el-input-number v-model="bounty.amountMax" :min="1" :step="100" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="累计获得积分门槛">
							<el-input-number v-model="bounty.minTotalEarned" :min="0" :step="10" />
							<div class="form-tip">发起悬赏需累计获得积分 ≥ 该值</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="注册天数门槛">
							<el-input-number v-model="bounty.minRegisterDays" :min="0" :step="1" />
							<div class="form-tip">注册满该天数才能发起悬赏</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="单用户最多活跃悬赏">
							<el-input-number v-model="bounty.maxActivePerUser" :min="1" :step="1" />
							<div class="form-tip">同一用户同时托管中的悬赏数上限</div>
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
		</el-card>

		<!-- 功能道具配置 -->
		<el-card v-permission="service.forum.config.permission.saveProps" class="mt-3" shadow="never">
			<template #header>
				<div class="flex items-center justify-between">
					<span>🔧 功能道具配置</span>
					<div>
						<el-button size="small" v-permission="service.forum.config.permission.reset" @click="resetGroup('props')">
							恢复默认
						</el-button>
						<el-button type="primary" size="small" :loading="savingProps" @click="saveProps">保存道具配置</el-button>
					</div>
				</div>
			</template>
			<el-form label-width="180px" label-position="left">
				<el-row :gutter="24">
					<el-col :xs="24" :md="12">
						<el-form-item label="补签价格">
							<el-input-number v-model="props.makeupPrice" :min="1" :step="10" />
							<div class="form-tip">补签昨日签到消耗</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="补签月上限">
							<el-input-number v-model="props.makeupMonthlyLimit" :min="1" :step="1" />
							<div class="form-tip">每月最多补签次数</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="改名价格">
							<el-input-number v-model="props.renamePrice" :min="1" :step="10" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="改名冷却（天）">
							<el-input-number v-model="props.renameCooldownDays" :min="1" :step="1" />
							<div class="form-tip">改名后 N 天内不可再改名</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="单次扩容（MB）">
							<el-input-number v-model="props.quotaPerPurchaseMb" :min="1" :step="10" />
							<div class="form-tip">每次上传配额扩容的 MB 数</div>
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="扩容价格">
							<el-input-number v-model="props.quotaPrice" :min="1" :step="10" />
						</el-form-item>
					</el-col>
					<el-col :xs="24" :md="12">
						<el-form-item label="总配额上限（MB）">
							<el-input-number v-model="props.quotaTotalLimitMb" :min="1" :step="100" />
							<div class="form-tip">扩容总封顶（基础 + 加购），超出后不再可扩容</div>
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
		</el-card>
		</div>
	</el-scrollbar>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'forum-config-index'
});

import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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

/** 默认商城配置（与 forum server 的 DEFAULT_SHOP_CONFIG 一致） */
const DEFAULT_SHOP = { defaultDurationDays: 30, remindDays: 3 };

/** 默认打赏配置（与 forum server 的 DEFAULT_TIP_CONFIG 一致） */
const DEFAULT_TIP = {
	amounts: [6, 66, 188],
	customMin: 1,
	customMax: 1000,
	dailyLimitPerUser: null,
	heatBase: 500,
	heatCap: 500
};

/** 默认悬赏配置（与 forum server 的 DEFAULT_BOUNTY_CONFIG 一致） */
const DEFAULT_BOUNTY = {
	feeRate: 0.1,
	timeoutDays: 7,
	amountMin: 50,
	amountMax: 10000,
	minTotalEarned: 0,
	minRegisterDays: 0,
	maxActivePerUser: 5
};

/** 默认功能道具配置（与 forum server 的 DEFAULT_PROPS_CONFIG 一致；配额字段以 MB 展示、提交转字节） */
const DEFAULT_PROPS = {
	makeupPrice: 80,
	makeupMonthlyLimit: 3,
	renamePrice: 200,
	renameCooldownDays: 30,
	quotaPerPurchaseMb: 10,
	quotaPrice: 150,
	quotaTotalLimitMb: 500
};

const MB = 1024 * 1024;

const checkin = reactive({ ...DEFAULT_CHECKIN });
const levels = ref<{ key: string; name: string; minTotal: number }[]>(DEFAULT_LEVELS.map((l) => ({ ...l })));

const shop = reactive({ ...DEFAULT_SHOP });
const tip = reactive({ ...DEFAULT_TIP, _noLimit: true });
const bounty = reactive({ ...DEFAULT_BOUNTY });
const props = reactive({ ...DEFAULT_PROPS });

const savingCheckin = ref(false);
const savingLevels = ref(false);
const savingShop = ref(false);
const savingTip = ref(false);
const savingBounty = ref(false);
const savingProps = ref(false);

onMounted(async () => {
	try {
		const data: any = await service.forum.config.getConfig();
		if (data?.checkin) Object.assign(checkin, data.checkin);
		if (Array.isArray(data?.levels) && data.levels.length) {
			levels.value = data.levels.map((l: any) => ({ key: l.key, name: l.name, minTotal: l.minTotal }));
		}
		// 消费体系四组（缺省用默认值；Redis 非法数据返回 null 也回退默认，与论坛端兜底一致）
		if (data?.shop) Object.assign(shop, data.shop);
		if (data?.tip) {
			Object.assign(tip, data.tip, {
				_noLimit: !(data.tip.dailyLimitPerUser != null && data.tip.dailyLimitPerUser > 0)
			});
		}
		if (data?.bounty) Object.assign(bounty, data.bounty);
		if (data?.props) {
			Object.assign(props, {
				makeupPrice: data.props.makeupPrice,
				makeupMonthlyLimit: data.props.makeupMonthlyLimit,
				renamePrice: data.props.renamePrice,
				renameCooldownDays: data.props.renameCooldownDays,
				quotaPerPurchaseMb: Math.round(data.props.quotaPerPurchase / MB),
				quotaPrice: data.props.quotaPrice,
				quotaTotalLimitMb: Math.round(data.props.quotaTotalLimit / MB)
			});
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

// ── 消费体系四组：保存（直写共享 Redis，forum 侧只读 + 校验） ──

async function saveShop() {
	savingShop.value = true;
	try {
		await service.forum.config.saveShop({ defaultDurationDays: shop.defaultDurationDays, remindDays: shop.remindDays });
		ElMessage.success('商城配置已保存');
	} catch (err: any) {
		showError(err, '保存失败');
	} finally {
		savingShop.value = false;
	}
}

async function saveTip() {
	// 勾选「不限制」时 dailyLimitPerUser 置空（与 zod schema nullable 对齐）
	const { _noLimit, ...rest } = tip;
	const payload = {
		...rest,
		dailyLimitPerUser: _noLimit ? null : tip.dailyLimitPerUser,
		amounts: (tip.amounts || []).map((v: any) => Number(v)).filter((v: number) => Number.isInteger(v) && v >= 1)
	};
	savingTip.value = true;
	try {
		await service.forum.config.saveTip(payload);
		ElMessage.success('打赏配置已保存');
	} catch (err: any) {
		showError(err, '保存失败');
	} finally {
		savingTip.value = false;
	}
}

async function saveBounty() {
	savingBounty.value = true;
	try {
		await service.forum.config.saveBounty({ ...bounty });
		ElMessage.success('悬赏配置已保存');
	} catch (err: any) {
		showError(err, '保存失败');
	} finally {
		savingBounty.value = false;
	}
}

async function saveProps() {
	// 配额字段 MB → 字节（与 forum 侧 schema 一致）
	savingProps.value = true;
	try {
		await service.forum.config.saveProps({
			makeupPrice: props.makeupPrice,
			makeupMonthlyLimit: props.makeupMonthlyLimit,
			renamePrice: props.renamePrice,
			renameCooldownDays: props.renameCooldownDays,
			quotaPerPurchase: props.quotaPerPurchaseMb * MB,
			quotaPrice: props.quotaPrice,
			quotaTotalLimit: props.quotaTotalLimitMb * MB
		});
		ElMessage.success('道具配置已保存');
	} catch (err: any) {
		showError(err, '保存失败');
	} finally {
		savingProps.value = false;
	}
}

// 恢复默认：删除 Redis key，forum 侧自动回退代码内置默认值
async function resetGroup(group: 'shop' | 'tip' | 'bounty' | 'props') {
	await ElMessageBox.confirm(`确定将${group === 'shop' ? '商城' : group === 'tip' ? '打赏' : group === 'bounty' ? '悬赏' : '道具'}配置恢复为默认值？`, '恢复默认', {
		type: 'warning',
		confirmButtonText: '恢复',
		cancelButtonText: '取消'
	});
	try {
		await service.forum.config.reset({ group });
		const defaults = { shop: DEFAULT_SHOP, tip: DEFAULT_TIP, bounty: DEFAULT_BOUNTY, props: DEFAULT_PROPS }[group];
		if (group === 'tip') Object.assign(tip, defaults, { _noLimit: true });
		else if (group === 'props') Object.assign(props, defaults);
		else if (group === 'shop') Object.assign(shop, defaults);
		else Object.assign(bounty, defaults);
		ElMessage.success('已恢复默认');
	} catch (err: any) {
		if (err === 'cancel' || err === 'close') return;
		showError(err, '恢复失败');
	}
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
