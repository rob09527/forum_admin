/**
 * 装饰商品目录（积分消费体系 2.2 的「固定货架」）。
 *
 * 产品形态：商城商品不再是运营自由填写的表单，而是一份「系统内置目录」——
 * 称号 = 图片索引（key 即 client/public/images/title-icons/ 下的 webp 文件名主干），
 * 颜色 = 固定 18 色。运营只改权重(sortOrder) / 价格(price) / 时效天数(durationDays) / 上下架(isActive)，
 * 不允许新增商品、不允许改商品名 / 渲染值。
 *
 * 本文件是「称号 + 颜色 + 头像目录生成规则」的单一事实来源，三处消费：
 * 1. service/shopItem.ts 的 seed（初始化自动填充 shop_items，幂等只插缺失行）；
 * 2. controller catalog 接口（后台下拉/预览的数据源）；
 * 3. 前台 client 侧只依赖 renderValue 的取值约定（称号 key → /images/title-icons/{key}.webp），
 *    不依赖本文件（DB 里存什么就渲染什么）。
 *
 * 头像风格清单不在此手抄：权威列表由 forum server 的 /api/avatar-styles 下发
 * （service/shopItem.ts 运行时拉取后调 buildAvatarCatalog 生成 360 个头像目录）。
 *
 * 若新增称号：先出图落 client/public/images/title-icons/ 与 admin/client/public/images/title-icons/，
 * 再往 TITLE_CATALOG 追加一行（key 必须与文件名主干一致），seed 会自动补齐。
 */

/** 称号商品定义（renderValue = key = 图片索引） */
export interface TitleIconDef {
  /** 图片索引：即 webp 文件名主干，如 title-tag-yiqigaofqian */
  key: string;
  /** 称号中文名（前台与后台展示） */
  name: string;
  /** 默认价格（鸡腿），运营可改 */
  price: number;
  /** 默认时效天数，运营可改（> 0） */
  durationDays: number;
  /** 排序权重，越小越靠前 */
  sortOrder: number;
}

/** 头像商品定义（renderValue = /avatars/{style}/avatar-{nn}.svg，价格 0 = 免费） */
export interface AvatarDef {
  /** 头像风格 id（对应 client/public/avatars/ 子目录） */
  style: string;
  /** 头像序号 1~20 */
  index: number;
  /** 头像路径（= shop_items.renderValue，购买时快照到 decorAvatarValue） */
  renderValue: string;
  /** 商品名（如 bottts-neutral-03），前台/通知展示 */
  name: string;
  /** 默认价格（鸡腿），0 = 免费，运营可改 */
  price: number;
  /** 默认时效天数（付费租用），运营可改 */
  durationDays: number;
  /** 排序权重，越小越靠前 */
  sortOrder: number;
}

/** 免费池头像风格（价格强制 0、不允许收费、永久有效不过期）：
 * 🤖机器人 bottts-neutral · 🔷几何 identicon · 👍拇指 thumbs · 😎表情 fun-emoji · 🗺️冒险2 adventurer-neutral · 🐰大耳2 big-ears-neutral */
export const AVATAR_FREE_STYLES = ['bottts-neutral', 'identicon', 'thumbs', 'fun-emoji', 'adventurer-neutral', 'big-ears-neutral'];

/** 付费头像默认价格 / 时效（免费池强制 0） */
const AVATAR_PAID_PRICE = 300;
const AVATAR_PAID_DURATION_DAYS = 90;

/** 是否免费池头像：免费池风格下的任意路径，价格强制 0，不允许收费 */
export function isFreePoolAvatar(renderValue: string): boolean {
  return AVATAR_FREE_STYLES.some((s) => renderValue.startsWith(`/avatars/${s}/`));
}

/**
 * 头像目录生成规则（不是静态 const）：风格清单来自 forum server /api/avatar-styles，
 * 运行时拉取后调用（见 service/shopItem.ts），本文件不复制风格列表、避免跨仓漂移。
 * 每个风格生成 perStyle 个头像（avatar-01.svg ~ avatar-NN.svg），
 * 免费池风格全免费、其余风格付费租用 300🍗/90 天。
 */
export function buildAvatarCatalog(styles: string[], perStyle: number): AvatarDef[] {
  return styles.flatMap((style, si) =>
    Array.from({ length: perStyle }, (_, i) => {
      const n = i + 1
      const num = String(n).padStart(2, '0')
      const isFree = AVATAR_FREE_STYLES.includes(style)
      return {
        style,
        index: n,
        renderValue: `/avatars/${style}/avatar-${num}.svg`,
        name: `${style}-${num}`,
        price: isFree ? 0 : AVATAR_PAID_PRICE,
        durationDays: AVATAR_PAID_DURATION_DAYS,
        sortOrder: si * perStyle + i,
      }
    }),
  );
}

/** 用户名颜色商品定义（renderValue = value = CSS 色值） */
export interface ColorDef {
  /** CSS 十六进制色值 */
  value: string;
  /** 颜色中文名 */
  name: string;
  /** 默认价格（鸡腿），运营可改 */
  price: number;
  /** 默认时效天数，运营可改（> 0） */
  durationDays: number;
  /** 排序权重，越小越靠前 */
  sortOrder: number;
}

/** 称号 30 天 / 颜色 30 天（默认值，运营可改时效天数，> 0 天即可） */
const TITLE_DURATION_DAYS = 30;
const COLOR_DURATION_DAYS = 30;

/** 称号默认价格（鸡腿） */
const TITLE_DEFAULT_PRICE = 300;
/** 颜色默认价格（鸡腿） */
const COLOR_DEFAULT_PRICE = 150;

/** 19 个专属称号（本次即梦出图的全部图标，顺序即默认排序） */
export const TITLE_CATALOG: TitleIconDef[] = [
  { key: 'title-tag-yiqigaofqian', name: '一起搞钱', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 0 },
  { key: 'title-tag-baodatui', name: '抱大腿', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 1 },
  { key: 'title-tag-datuizaici', name: '大腿在此', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 2 },
  { key: 'title-tag-dundalao', name: '蹲大佬', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 3 },
  { key: 'title-tag-qiudaifei', name: '求带飞', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 4 },
  { key: 'title-tag-zhaodazi', name: '找搭子', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 5 },
  { key: 'title-tag-hehuoren', name: '合伙人', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 6 },
  { key: 'title-tag-dunoffer', name: '蹲 offer', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 7 },
  { key: 'title-tag-zhaobingmaima', name: '招兵买马', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 8 },
  { key: 'title-tag-meishaonv', name: '美少女', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 9 },
  { key: 'title-tag-chengxuyuan', name: '程序媛', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 10 },
  { key: 'title-tag-tutouyubeiyi', name: '秃头预备役', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 11 },
  { key: 'title-tag-mengxinqiudai', name: '萌新求带', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 12 },
  { key: 'title-tag-jiedanxia', name: '接单侠', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 13 },
  { key: 'title-tag-tokendahu', name: 'Token 大户', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 14 },
  { key: 'title-tag-moxingxunshoushi', name: '模型驯兽师', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 15 },
  { key: 'title-tag-jituilieren', name: '鸡腿猎人', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 16 },
  { key: 'title-tag-shequjishi', name: '社区基石', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 17 },
  { key: 'title-tag-zhenzhanzhibao', name: '镇站之宝', price: TITLE_DEFAULT_PRICE, durationDays: TITLE_DURATION_DAYS, sortOrder: 18 },
];

/** 18 个最亮眼的用户名颜色（固定色板，运营只改权重/价格/上下架） */
export const COLOR_CATALOG: ColorDef[] = [
  { value: '#FF4D4F', name: '珊瑚红', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 0 },
  { value: '#FF7A00', name: '落日橙', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 1 },
  { value: '#FA8C16', name: '琥珀金', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 2 },
  { value: '#E8A90A', name: '麦穗黄', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 3 },
  { value: '#52C41A', name: '草绿', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 4 },
  { value: '#00B96B', name: '翠松绿', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 5 },
  { value: '#13C2C2', name: '青碧', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 6 },
  { value: '#40A9FF', name: '天蓝', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 7 },
  { value: '#1890FF', name: '海蓝', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 8 },
  { value: '#2F54EB', name: '宝蓝', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 9 },
  { value: '#10239E', name: '藏蓝', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 10 },
  { value: '#722ED1', name: '紫罗兰', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 11 },
  { value: '#9254DE', name: '藕荷紫', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 12 },
  { value: '#EB2F96', name: '品红', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 13 },
  { value: '#F759AB', name: '玫红', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 14 },
  { value: '#FF7BA9', name: '桃花粉', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 15 },
  { value: '#CF1322', name: '酒红', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 16 },
  { value: '#D4380D', name: '朱砂红', price: COLOR_DEFAULT_PRICE, durationDays: COLOR_DURATION_DAYS, sortOrder: 17 },
];
