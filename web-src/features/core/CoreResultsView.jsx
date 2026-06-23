import MetricCard from '../../components/MetricCard.jsx';
import { ColoredChars, ScsChars } from '../../components/SequenceTokens.jsx';
import { formatBytes } from '../../lib/wasmClient.js';

/**
 * 展示一次 LCS/SCS 计算后的核心结果。
 * 本组件不发起计算，只接收已完成的 result，保证数据流方向清晰。
 */
export default function CoreResultsView({ result, str1, str2, onShowVisual }) {
  return (
    <section className="page-panel page-enter page-enter-rise">
      <div className="section-head">
        <div>
          <h1>核心结果</h1>
          <p>浏览器端 WebAssembly 直接执行 C++ 动态规划内核，结果与可视化保持同步。</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onShowVisual}>
          <span className="icon-glyph" aria-hidden="true">D</span>
          查看动画
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard label="LCS 长度" value={result?.lcs?.length ?? '-'} note="最长公共子序列" />
        <MetricCard label="SCS 长度" value={result?.scs?.length ?? '-'} note="最短公共超序列" />
        <MetricCard label="标准 DP" value={`${result?.lcs?.timeUs ?? '-'} us`} note="Wasm 二维表" />
        <MetricCard label="优化空间" value={result ? formatBytes(result.lcs.optimizedMemoryBytes) : '-'} note="滚动数组" />
        <MetricCard label="Hirschberg" value={`${result?.lcs?.hirschbergTimeUs ?? '-'} us`} note="线性空间重构" />
      </div>

      <div className="content-grid">
        <article className="panel-card">
          <h3>LCS 序列</h3>
          <div className="sequence-view"><ColoredChars sequence={result?.lcs?.sequence} /></div>
          <p>
            暴力递归：
            {result?.lcs?.bruteForceSkipped
              ? '输入较长，自动跳过指数级递归'
              : `${result?.lcs?.bruteForceLength ?? 0}，耗时 ${result?.lcs?.bruteForceTimeUs ?? 0} us`}
          </p>
        </article>

        <article className="panel-card">
          <h3>Hirschberg 序列</h3>
          <div className="sequence-view"><ColoredChars sequence={result?.lcs?.hirschbergSequence} /></div>
          <p>
            长度 {result?.lcs?.hirschbergLength ?? 0}，空间 {result ? formatBytes(result.lcs.hirschbergMemoryBytes) : '-'}。
          </p>
        </article>

        <article className="panel-card">
          <h3>SCS 序列</h3>
          <div className="sequence-view"><ScsChars scs={result?.scs} /></div>
          <p>
            长度公式：
            {Array.from(str1).length}+{Array.from(str2).length}-{result?.lcs?.length ?? 0}={result?.scs?.length ?? 0}
          </p>
        </article>
      </div>

      <div className="analysis-strip">
        <div>
          <strong>计算内核</strong>
          <span>C++ 标准 DP、滚动数组与 Hirschberg 线性空间重构统一编译为 WebAssembly。</span>
        </div>
        <div>
          <strong>展示重点</strong>
          <span>LCS/SCS 构造、回溯路径、性能曲线、长文本压力测试和参考文献阅读页。</span>
        </div>
      </div>
    </section>
  );
}
