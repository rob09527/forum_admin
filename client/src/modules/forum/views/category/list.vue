<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新 -->
			<cl-refresh-btn />
			<!-- 新增 -->
			<el-button type="primary" @click="openAdd">新增分类</el-button>
			<cl-flex1 />
			<!-- 关键字搜索（名称/slug） -->
			<cl-search-key :placeholder="$t('搜索名称 / slug')" />
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
		<el-dialog v-model="formVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="480px" top="10vh">
			<el-form label-width="80px">
				<el-form-item label="slug">
					<el-input v-model="form.slug" :disabled="isEdit" placeholder="小写字母/数字/连字符，如 hardware" />
				</el-form-item>
				<el-form-item label="名称">
					<el-input v-model="form.name" placeholder="板块中文名" />
				</el-form-item>
				<el-form-item label="图标">
					<el-input v-model="form.icon" placeholder="emoji，如 🖥️" />
				</el-form-item>
				<el-form-item label="排序">
					<el-input-number v-model="form.sortOrder" :min="0" :max="999" />
				</el-form-item>
				<el-form-item label="启用">
					<el-switch v-model="form.isEnabled" />
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
	name: 'forum-category-list'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { showError } from '/@/cool/utils';
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const { service } = useCool();
const { t } = useI18n();

// cl-table
const Table = useTable({
	columns: [
		{
			label: 'ID',
			prop: 'id',
			width: 70
		},
		{
			label: t('名称'),
			prop: 'name',
			minWidth: 140
		},
		{
			label: 'slug',
			prop: 'slug',
			minWidth: 120
		},
		{
			label: t('图标'),
			prop: 'icon',
			width: 80
		},
		{
			label: t('排序'),
			prop: 'sortOrder',
			width: 80
		},
		{
			label: t('帖子数'),
			prop: 'postCount',
			width: 90
		},
		{
			label: t('启用'),
			prop: 'isEnabled',
			width: 80,
			align: 'center',
			component: {
				name: 'cl-switch'
			}
		},
		{
			label: t('创建时间'),
			prop: 'createdAt',
			minWidth: 160
		},
		{
			type: 'op',
			width: 100,
			buttons: [
				{
					label: t('编辑'),
					type: 'primary',
					onClick: ({ scope }) => openEdit(scope.row)
				},
				{
					label: t('删除'),
					type: 'danger',
					onClick: ({ scope }) => removeCategory(scope.row)
				}
			]
		}
	]
});

// cl-crud（回调触发首次加载）
const Crud = useCrud({ service: service.forum.category }, app => {
	app.refresh();
});

// 新增/编辑弹窗
const formVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
	id: null as number | null,
	slug: '',
	name: '',
	icon: '📂',
	sortOrder: 0,
	isEnabled: true
});

function openAdd() {
	isEdit.value = false;
	Object.assign(form, { id: null, slug: '', name: '', icon: '📂', sortOrder: 0, isEnabled: true });
	formVisible.value = true;
}

function openEdit(row: any) {
	isEdit.value = true;
	Object.assign(form, {
		id: row.id,
		slug: row.slug,
		name: row.name,
		icon: row.icon,
		sortOrder: row.sortOrder,
		isEnabled: row.isEnabled
	});
	formVisible.value = true;
}

// 保存（新增/编辑共用）
async function save() {
	if (!form.name) {
		ElMessage.warning('请填写名称');
		return;
	}
	if (!isEdit.value && !form.slug) {
		ElMessage.warning('请填写 slug');
		return;
	}
	const payload = {
		name: form.name,
		icon: form.icon || '📂',
		sortOrder: form.sortOrder ?? 0,
		isEnabled: form.isEnabled
	};
	try {
		if (isEdit.value) {
			await service.forum.category.update({ id: form.id, ...payload });
		} else {
			await service.forum.category.add({ slug: form.slug, ...payload });
		}
		ElMessage.success('已保存');
		formVisible.value = false;
		Crud.value?.refresh();
	} catch (err) {
		// 业务错误（如 slug 重复）请求层只 reject 不弹窗，这里统一提示
		showError(err, '保存失败');
	}
}


// 删除分类（破坏性操作，二次确认）
function removeCategory(row: any) {
	ElMessageBox.confirm(`确定删除分类「${row.name}」？`, t('删除分类'), {
		type: 'warning',
		confirmButtonText: t('删除'),
		cancelButtonText: t('取消'),
		confirmButtonClass: 'el-button--danger'
	})
		.then(() => service.forum.category.delete({ ids: [row.id] }))
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
