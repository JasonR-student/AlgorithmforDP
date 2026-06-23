const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789__dynamic_programming__';

/**
 * 生成指定长度范围内的随机文本。
 * 字符集刻意包含算法主题词，让长文本样例更贴合课程项目。
 */
export function randomText(minLen, maxLen) {
  const min = Math.max(0, Math.floor(Number(minLen) || 0));
  const max = Math.max(min, Math.floor(Number(maxLen) || min));
  const len = min + Math.floor(Math.random() * (max - min + 1));
  let value = '';
  for (let i = 0; i < len; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

/**
 * 一次生成 S1/S2 两个随机字符串。
 * 页面随机按钮使用它保证两条输入长度来自同一范围。
 */
export function randomPair(minLen, maxLen) {
  return {
    str1: randomText(minLen, maxLen),
    str2: randomText(minLen, maxLen),
  };
}
