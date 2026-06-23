import { TABS } from '../config/tabs.js';

/**
 * 从地址栏读取主工作区标签。
 * 如果外部传入了未知 tab，则回退到核心结果页，避免页面空白。
 */
export function getInitialTab() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TABS.includes(tab) ? tab : 'core';
}
