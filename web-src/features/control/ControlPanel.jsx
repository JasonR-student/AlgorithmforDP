import { APP_VERSION } from '../../config/version.js';
import { PRESETS } from '../../config/presets.js';

/**
 * 渲染左侧输入、随机生成和文件操作控制区。
 * 这里不直接处理业务算法，只把用户动作转交给上层状态 hook。
 */
export default function ControlPanel({
  str1,
  str2,
  minLen,
  maxLen,
  status,
  showDp,
  fileInputRef,
  onStr1Change,
  onStr2Change,
  onMinLenChange,
  onMaxLenChange,
  onShowDpChange,
  onPreset,
  onCalculate,
  onOpenLongText,
  onGenerateRandom,
  onImportFile,
  onExportFile,
}) {
  return (
    <aside className="control-panel">
      <section className="panel-card input-card">
        <div className="card-head">
          <h2>输入与随机长文本</h2>
          <span className="tag">{APP_VERSION}</span>
        </div>
        <div className="preset-grid">
          {PRESETS.map((item) => (
            <button key={item[0]} type="button" className="filter-chip" onClick={() => onPreset(item)}>
              {item[0]}
            </button>
          ))}
        </div>
        <label className="form-label">
          字符串 S1 <small>{Array.from(str1).length} 位</small>
          <textarea value={str1} onChange={(event) => onStr1Change(event.target.value)} />
        </label>
        <label className="form-label">
          字符串 S2 <small>{Array.from(str2).length} 位</small>
          <textarea value={str2} onChange={(event) => onStr2Change(event.target.value)} />
        </label>
        <div className="action-row">
          <button type="button" className="btn-primary" onClick={onCalculate}>
            开始计算
          </button>
          <button type="button" className="btn-secondary" onClick={onOpenLongText}>
            长文本视图
          </button>
        </div>
      </section>

      <section className="panel-card">
        <h3>随机长度挡位</h3>
        <div className="preset-grid">
          <button type="button" className="filter-chip" onClick={() => onGenerateRandom([100, 200])}>
            100-200
          </button>
          <button type="button" className="filter-chip" onClick={() => onGenerateRandom([200, 300])}>
            200-300
          </button>
          <button type="button" className="filter-chip" onClick={() => onGenerateRandom([100, 300])}>
            100-300
          </button>
        </div>
        <label className="range-label">
          最小长度 <b>{minLen}</b>
          <input type="range" min="10" max="800" step="10" value={minLen} onChange={(event) => onMinLenChange(Number(event.target.value))} />
        </label>
        <label className="range-label">
          最大长度 <b>{maxLen}</b>
          <input type="range" min="20" max="1200" step="10" value={maxLen} onChange={(event) => onMaxLenChange(Number(event.target.value))} />
        </label>
        <button type="button" className="btn-primary full" onClick={() => onGenerateRandom()}>
          随机生成并显示位数
        </button>
      </section>

      <section className="panel-card">
        <h3>文件与选项</h3>
        <input ref={fileInputRef} type="file" accept=".txt,.lcs" hidden onChange={onImportFile} />
        <div className="action-row">
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            导入文件
          </button>
          <button type="button" className="btn-secondary" onClick={onExportFile}>
            导出结果
          </button>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={showDp} onChange={(event) => onShowDpChange(event.target.checked)} />
          <span>小规模显示完整 DP 表</span>
        </label>
        <p className="status-line">{status}</p>
      </section>
    </aside>
  );
}
