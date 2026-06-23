import Charts from '../../components/Charts.jsx';

/**
 * 展示批量性能测试入口、图表和实测结论。
 * 真正的测试逻辑由 useVisualizerState 提供，组件只负责用户交互和结果呈现。
 */
export default function PerformanceView({ perfRows, onRunPerf }) {
  return (
    <section className="page-panel page-enter page-enter-slide-left">
      <div className="section-head">
        <div>
          <h1>效率分析</h1>
          <p>多图表展示耗时趋势、空间占用、优化比例与效率散点，并提供可导出的性能数据模板。</p>
        </div>
        <button type="button" className="btn-primary" onClick={onRunPerf}>
          <span className="icon-glyph" aria-hidden="true">P</span>
          一键性能测试
        </button>
      </div>

      <Charts rows={perfRows} />

      <div className="analysis-strip">
        <div>
          <strong>理论复杂度</strong>
          <span>标准 DP、滚动数组与 Hirschberg 的时间复杂度均为 O(nm)；空间分别为 O(nm)、O(min(n,m)) 和线性辅助空间。</span>
        </div>
        <div>
          <strong>实测结论</strong>
          <span>
            {perfRows.length
              ? `长度 ${perfRows.at(-1).length} 时，滚动数组空间占比 ${(
                  (perfRows.at(-1).optimizedMemoryBytes / perfRows.at(-1).standardMemoryBytes) *
                  100
                ).toFixed(3)}%，Hirschberg 空间占比 ${(
                  (perfRows.at(-1).hirschbergMemoryBytes / perfRows.at(-1).standardMemoryBytes) *
                  100
                ).toFixed(3)}%。`
              : '运行后生成实测曲线。'}
          </span>
        </div>
      </div>
    </section>
  );
}
