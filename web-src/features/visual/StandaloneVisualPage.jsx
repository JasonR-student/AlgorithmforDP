import { APP_VERSION } from '../../config/version.js';
import { PRESETS } from '../../config/presets.js';
import AppFooter from '../../components/AppFooter.jsx';
import DpVisualizer from '../../components/DpVisualizer.jsx';

/**
 * 独立动画表格页。
 * 顶部集中放输入和操作按钮，下面给 DP 动画表格保留完整宽度。
 */
export default function StandaloneVisualPage({
  str1,
  str2,
  status,
  showDp,
  result,
  onStr1Change,
  onStr2Change,
  onShowDpChange,
  onPreset,
  onCalculate,
  onGenerateRandom,
}) {
  return (
    <div className="standalone-page">
      <header className="standalone-header">
        <div>
          <strong>LCS/SCS 独立动画表格</strong>
          <span>顶部调整输入与播放选项，下面集中查看 DP 表和动画过程。</span>
        </div>
        <a className="btn-secondary" href="./?tab=visual">
          返回主界面
        </a>
      </header>

      <main className="standalone-main">
        <section className="panel-card visual-control-top">
          <div className="compact-control-head">
            <h2>输入与操作</h2>
            <span className="tag">{APP_VERSION}</span>
          </div>
          <div className="visual-control-grid">
            <label className="form-label">
              字符串 S1 <small>{Array.from(str1).length} 位</small>
              <textarea value={str1} onChange={(event) => onStr1Change(event.target.value)} />
            </label>
            <label className="form-label">
              字符串 S2 <small>{Array.from(str2).length} 位</small>
              <textarea value={str2} onChange={(event) => onStr2Change(event.target.value)} />
            </label>
            <div className="visual-control-actions">
              <div className="preset-grid preset-grid-compact">
                {PRESETS.map((item) => (
                  <button key={item[0]} type="button" className="filter-chip" onClick={() => onPreset(item)}>
                    {item[0]}
                  </button>
                ))}
              </div>
              <div className="action-row">
                <button type="button" className="btn-primary" onClick={onCalculate}>
                  重新计算
                </button>
                <button type="button" className="btn-secondary" onClick={() => onGenerateRandom()}>
                  随机生成
                </button>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={showDp} onChange={(event) => onShowDpChange(event.target.checked)} />
                <span>显示完整 DP 表</span>
              </label>
              <p className="status-line">{status}</p>
            </div>
          </div>
        </section>

        <section className="page-panel visual-full-panel">
          <DpVisualizer result={result} standalone />
        </section>
      </main>
      <AppFooter compact />
    </div>
  );
}
