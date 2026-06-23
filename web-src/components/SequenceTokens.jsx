/**
 * 将普通序列拆成逐字符 token。
 * source 用来控制 token 颜色，例如 common、s1、s2。
 */
export function ColoredChars({ sequence, source = 'common' }) {
  if (!sequence) return <span className="muted">空串</span>;
  return Array.from(sequence).map((ch, index) => (
    <span key={`${ch}-${index}`} className={`char-token ${source}`}>
      {ch}
    </span>
  ));
}

/**
 * 将 SCS 序列按来源着色。
 * Wasm 返回 sources 数组后，页面可以清楚区分公共字符、S1 专属字符和 S2 专属字符。
 */
export function ScsChars({ scs }) {
  if (!scs?.sequence) return <span className="muted">空串</span>;
  return Array.from(scs.sequence).map((ch, index) => (
    <span key={`${ch}-${index}`} className={`char-token ${scs.sources[index] || 'common'}`}>
      {ch}
    </span>
  ));
}
