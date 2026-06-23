/**
 * 向后端问答接口发送对话消息。
 * 前端只发送必要上下文，具体密钥和供应商信息只留在服务端。
 */
export async function sendChatMessage(messages, context) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '问答服务暂时不可用。');
  return payload;
}

/**
 * 在线服务不可用时的基础说明。
 * 该函数保证课堂演示即使没有密钥也能给出基础解释。
 */
export function localAnalysis(context, question) {
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
      return `说明：当前论文是《${context.referenceTitleZh || context.referenceTitleEn}》，来源为 ${context.referenceVenue || '开放获取文献'}。它的核心价值是：${context.referenceSummary || '补充 LCS/SCS 相关算法背景'}。基础实现可从标准 DP 表、回溯路径和空间优化三个层次展开，再结合页面中的 LCS、SCS 与 Hirschberg 对照说明。`;
    }
    return '说明：参考文献覆盖标准 LCS/SCS、加权变体、近似算法、Hirschberg 线性空间重构和公共子序列扩展问题，可分别支撑算法正确性、空间优化和研究延展三个层面的说明。';
  }

  if (mode.includes('算法')) {
    return '说明：LCS 通过前缀子问题构造二维 DP 表；SCS 复用 LCS 表进行回溯，把公共字符只保留一次，因此长度满足 |S1|+|S2|-|LCS|。Hirschberg 方法通过二分 S1 并用正反两次线性 DP 定位分割点，从而重构序列。';
  }

  return `说明：当前 S1/S2 长度为 ${context.str1Length}/${context.str2Length}，LCS 长度 ${context.lcsLength}，SCS 长度 ${context.scsLength}。问题：${question || '分析当前数据'}。`;
}
