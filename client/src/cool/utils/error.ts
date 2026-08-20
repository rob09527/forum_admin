import { ElMessage } from 'element-plus';

/**
 * 统一展示请求错误。
 *
 * Cool Admin 请求层对「业务错误」（HTTP 200 但 code != 1000）只 reject、不自动弹窗，
 * HTTP 错误也只是返回 message。因此**直接调用 service.xxx() 的地方**必须在 catch 里
 * 显式调用本函数，否则后端校验失败（如「必须恰好一个门槛为 0 的起始等级」）用户无感知。
 *
 * 注意：
 * - `@cool-vue/crud`（cl-crud / cl-form / cl-switch）自带错误提示，不要再包一层，会双重弹窗。
 * - 删除等「确认框 + service」流程：确认框取消会 reject（'cancel'/'close'），需自行先拦截，
 *   见 forum 各列表页的 remove* 函数写法。
 *
 * @param err      catch 拿到的错误。请求层已归一化为 { code, message }，message 即后端提示；
 *                 对原生 axios 错误兜底取 response.data.message。
 * @param fallback 无 message 时的兜底文案
 */
export function showError(err: any, fallback = '操作失败'): void {
	const message =
		(typeof err?.message === 'string' && err.message) ||
		(typeof err?.response?.data?.message === 'string' && err.response.data.message) ||
		fallback;
	ElMessage.error(message);
}
