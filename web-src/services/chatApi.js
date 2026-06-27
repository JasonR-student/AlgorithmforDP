async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '问答服务暂时不可用。');
  return payload;
}

function apiUrl(path) {
  const configuredBase = window.__LCS_SCS_CHAT_API_BASE__ || '';
  const base = configuredBase || (window.location.protocol === 'file:' ? 'https://stringdpproject.vercel.app' : '');
  return `${base.replace(/\/+$/, '')}${path}`;
}

function resolveChatScope(context = {}) {
  if (context.chatScope) return context.chatScope;
  return String(context.mode || '').includes('文献') || context.referenceHref ? 'lcs_scs_reference' : 'lcs_scs';
}

function compactText(value = '', limit = 3600) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function collectPageContext() {
  const selectors = ['.workspace', '.reference-pdf-panel', '.standalone-header', '.reader-paper-head', '.reference-method-panel'];
  const text = selectors
    .map((selector) => document.querySelector(selector)?.innerText || '')
    .filter(Boolean)
    .join('\n');
  const pagePath = `${window.location.pathname}${window.location.search}`;
  return {
    pageTitle: document.title,
    pagePath,
    pageUrl: window.location.href,
    pageText: compactText(text || document.body?.innerText || ''),
  };
}

export async function fetchChatQuota(context = {}) {
  const chatScope = resolveChatScope(context);
  const pagePath = `${window.location.pathname}${window.location.search}`;
  const query = new URLSearchParams({ scope: chatScope, path: pagePath, mode: context.mode || '' });
  return readJson(await fetch(apiUrl(`/api/chat?${query.toString()}`)));
}

export async function sendChatMessage(messages, context = {}) {
  const chatScope = resolveChatScope(context);
  const pageContext = collectPageContext();
  const response = await fetch(apiUrl('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      context: { ...pageContext, ...context, chatScope, pagePath: pageContext.pagePath },
      chatScope,
      pagePath: pageContext.pagePath,
    }),
  });

  return readJson(response);
}

export function localAnalysis(context = {}, question = '') {
  const ratio =
    context.standardMemoryBytes > 0
      ? ((context.optimizedMemoryBytes / context.standardMemoryBytes) * 100).toFixed(3)
      : '0.000';
  const hirschbergRatio =
    context.standardMemoryBytes > 0 && context.hirschbergMemoryBytes
      ? ((context.hirschbergMemoryBytes / context.standardMemoryBytes) * 100).toFixed(3)
      : '0.000';
  const mode = context.mode || '综合分析';

  if (mode.includes('效率')) {
    return `说明：标准二维 DP 保留完整矩阵，空间复杂度为 O(nm)；滚动数组只保留相邻两行，空间复杂度为 O(min(n,m))；Hirschberg 方法在保持可重构 LCS 的前提下使用线性空间。当前滚动数组空间约为标准 DP 的 ${ratio}%，Hirschberg 空间约为 ${hirschbergRatio}%。`;
  }

  if (mode.includes('文献')) {
    if (context.referenceTitleEn || context.referenceTitleZh) {
      return `说明：当前论文是《${context.referenceTitleZh || context.referenceTitleEn}》，来源为 ${context.referenceVenue || '开放获取文献'}。它在页面中的使用方式是：${context.referenceMethodUse || context.referenceReplicatedIn || '支撑 LCS/SCS 算法讲解'}。在线服务启用后，后端会读取 PDF 正文摘录、页面说明和算法状态。`;
    }
    return '说明：参考文献覆盖标准 LCS/SCS、加权变体、近似算法、Hirschberg 线性空间重构和公共子序列扩展问题，可分别支撑算法正确性、空间优化和研究延展三个层面的说明。';
  }

  if (mode.includes('算法')) {
    return '说明：LCS 通过前缀子问题构造二维 DP 表；SCS 复用 LCS 表进行回溯，把公共字符只保留一次，因此长度满足 |S1|+|S2|-|LCS|。Hirschberg 方法通过二分 S1 并用正反两次线性 DP 定位分割点，从而重构序列。';
  }

  return `说明：当前 S1/S2 长度为 ${context.str1Length}/${context.str2Length}，LCS 长度 ${context.lcsLength}，SCS 长度 ${context.scsLength}。问题：${question || '分析当前数据'}。`;
}
