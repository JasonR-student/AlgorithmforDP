/**
 * 读取独立文献阅读页的论文 id。
 * 该 id 对应 references.js 中的条目，用于决定 PDF 和问答上下文。
 */
export function getRouteReferenceId() {
  return new URLSearchParams(window.location.search).get('id') || '';
}
