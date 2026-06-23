import { VISUAL_STATE_KEY } from '../config/visualState.js';

/**
 * 保存独立动画页打开前的输入和 DP 表开关。
 * 使用 localStorage 是为了兼容带 noopener 的新标签页。
 */
export function storeVisualState({ str1, str2, showDp }) {
  window.localStorage.setItem(VISUAL_STATE_KEY, JSON.stringify({ str1, str2, showDp }));
}
