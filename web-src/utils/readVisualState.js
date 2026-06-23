import { VISUAL_STATE_KEY } from '../config/visualState.js';

/**
 * 从 localStorage 读取独立动画页需要恢复的输入状态。
 * 读取失败时返回 null，让页面使用默认教材样例继续工作。
 */
export function readVisualState() {
  try {
    return JSON.parse(window.localStorage.getItem(VISUAL_STATE_KEY) || 'null');
  } catch {
    return null;
  }
}
