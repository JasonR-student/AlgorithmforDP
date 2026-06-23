/**
 * 读取当前是否处在特殊独立页面。
 * 空字符串表示常规主界面，visual-full 和 reference 分别对应独立动画页与文献阅读页。
 */
export function getRouteView() {
  return new URLSearchParams(window.location.search).get('view') || '';
}
