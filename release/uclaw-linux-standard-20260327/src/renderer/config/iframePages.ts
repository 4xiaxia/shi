/**
 * iframe 内嵌页面集中配置
 *
 * 所有 iframe URL 统一在这里管理，不要散落在组件里。
 * 修改 URL 只需改这个文件。
 */

export interface IframePage {
  /** 唯一标识，对应 mainView 的值 */
  key: string;
  /** 侧边栏显示名称 */
  label: string;
  /** iframe 加载地址 */
  url: string;
  /** 侧边栏图标颜色 (Tailwind text-* class) */
  iconColor: string;
  /** 侧边栏背景色 (Tailwind bg-* class, 用于 active 态) */
  activeBg: string;
  /** 是否显示红点 "热" 标签 */
  showHotBadge: boolean;
}

/**
 * ========== 在这里集中配置所有 iframe 页面 ==========
 * 新增页面只需往数组里加一项，Sidebar 和 App.tsx 会自动渲染。
 * {BREAKPOINT} IFRAME-PAGE-CONFIG
 * {FLOW} IFRAME-EXTERNAL-ENTRY: 这里的 URL 都是外部页面；若嵌入失败，先确认目标站是否允许 iframe，而不是先怀疑前端壳层。
 */
export const IFRAME_PAGES: IframePage[] = [
  {
    key: 'resourceShare',
    label: '提示词大全',
    url: 'https://my.feishu.cn/wiki/EYRHw0XuHiQRpzkBapscaL0wnpe',
    iconColor: 'text-blue-500',
    activeBg: 'from-blue-500/15 to-blue-500/5',
    showHotBadge: true,
  },
  {
    key: 'freeImageGen',
    label: '免费生图',
    url: 'https://aiimagetoimage.io/',
    iconColor: 'text-pink-500',
    activeBg: 'from-pink-500/15 to-pink-500/5',
    showHotBadge: true,
  },
  {
    key: 'employeeStore',
    label: '雇员商店',
    url: '', // 非 iframe 页面，有独立组件
    iconColor: 'text-amber-500',
    activeBg: 'from-amber-500/15 to-amber-500/5',
    showHotBadge: true,
  },
];

/** 根据 key 获取 iframe 配置 */
export const getIframePage = (key: string): IframePage | undefined =>
  IFRAME_PAGES.find((p) => p.key === key);
