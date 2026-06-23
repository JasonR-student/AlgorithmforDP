/**
 * 解析用户导入的输入文件。
 * 支持 key=value 和纯文本两种形式，方便学生手工编辑样例。
 */
export function parseInputFile(content = '') {
  const rows = String(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^\[.+\]$/.test(line));

  let str1 = '';
  let str2 = '';
  for (const row of rows) {
    if (row.startsWith('str1=')) str1 = row.slice(5).replace(/\s+#.*$/, '');
    else if (row.startsWith('str2=')) str2 = row.slice(5).replace(/\s+#.*$/, '');
    else if (!str1) str1 = row;
    else if (!str2) str2 = row;
  }

  return { str1, str2 };
}

/**
 * 生成可导出的实验结果文本。
 * 文件中保留注释，便于后续查看每个字段代表的含义。
 */
export function generateResultFile({ str1, str2, result, perf }) {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const lcs = result?.lcs || {};
  const scs = result?.scs || {};
  const perfLine = perf?.length
    ? `performance_items=${perf.length} # 性能测试样本数量`
    : 'performance_items=0 # 尚未运行批量性能测试';
  const perfRows = (perf || []).flatMap((row, index) => [
    `[Performance.${index + 1}] # 第 ${index + 1} 组性能测试数据`,
    `length=${row.length} # 随机测试字符串长度`,
    `standard_time_us=${row.standardTimeUs} # 标准 DP 耗时，单位微秒`,
    `rolling_time_us=${row.optimizedTimeUs} # 滚动数组耗时，单位微秒`,
    `hirschberg_time_us=${row.hirschbergTimeUs} # Hirschberg 耗时，单位微秒`,
    `standard_memory_bytes=${row.standardMemoryBytes} # 标准 DP 空间占用，单位字节`,
    `rolling_memory_bytes=${row.optimizedMemoryBytes} # 滚动数组空间占用，单位字节`,
    `hirschberg_memory_bytes=${row.hirschbergMemoryBytes} # Hirschberg 空间占用，单位字节`,
  ]);

  return [
    '# 字符串动态规划实验结果文件 # 文件类型说明',
    `# 生成时间: ${now} # 浏览器端生成的本地报告时间`,
    '[Input] # 输入数据区域',
    `str1=${str1} # 字符串 S1`,
    `str2=${str2} # 字符串 S2`,
    '[LCS Result] # 最长公共子序列结果区域',
    `length=${lcs.length ?? 0} # LCS 长度`,
    `sequence=${lcs.sequence ?? ''} # LCS 具体序列`,
    `time_us=${lcs.timeUs ?? 0} # Wasm 标准二维 DP 运行耗时，单位微秒`,
    `optimized_time_us=${lcs.optimizedTimeUs ?? 0} # Wasm 滚动数组运行耗时，单位微秒`,
    `hirschberg_time_us=${lcs.hirschbergTimeUs ?? 0} # Hirschberg 线性空间重构耗时，单位微秒`,
    `hirschberg_sequence=${lcs.hirschbergSequence ?? ''} # Hirschberg 重构得到的 LCS 序列`,
    '[SCS Result] # 最短公共超序列结果区域',
    `length=${scs.length ?? 0} # SCS 长度，等于 len(S1)+len(S2)-len(LCS)`,
    `sequence=${scs.sequence ?? ''} # SCS 具体序列`,
    '[Performance] # 性能测试区域',
    perfLine,
    ...perfRows,
    '',
  ].join('\n');
}

/**
 * 在浏览器端下载普通文本。
 * 通过 Blob URL 完成，不需要上传数据到服务器。
 */
export function downloadText(filename, content) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
