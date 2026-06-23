/**
 * 展示当前两条长字符串。
 * 用户可以从这里打开独立动画页，避免主界面被长输入和 DP 表同时挤压。
 */
export default function LongTextDialog({ str1, str2, onClose, onOpenStandalone }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="section-head">
          <div>
            <h2>超长文本可视化</h2>
            <p>上层窗口集中展示长文本，主工作区保持稳定布局。</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="btn-primary" onClick={onOpenStandalone}>
            新页面动画表格
          </button>
        </div>
        <div className="content-grid">
          <article className="panel-card">
            <h3>S1 · {Array.from(str1).length} 位</h3>
            <pre className="long-text">{str1}</pre>
          </article>
          <article className="panel-card">
            <h3>S2 · {Array.from(str2).length} 位</h3>
            <pre className="long-text">{str2}</pre>
          </article>
        </div>
      </div>
    </div>
  );
}
