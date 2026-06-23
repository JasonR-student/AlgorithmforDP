import { references } from '../../data/references.js';

/**
 * 展示参考文献紧凑列表。
 * PDF 不在列表页预览，只有点击打开论文后才进入独立阅读页。
 */
export default function ReferencesView({ selectedRef, refMode, onRefModeChange, onSelectRef, onOpenReference, onAskAi }) {
  return (
    <section className="page-panel page-enter page-enter-scale">
      <div className="section-head">
        <div>
          <h1>参考文献</h1>
          <p>列表保持紧凑展示；点击打开后在新页面阅读 PDF，并在右侧使用 AI 提问。</p>
        </div>
        <div className="toolbar compact">
          <button type="button" className={`mini-action ${refMode === 'grid' ? 'mini-action-active' : ''}`} onClick={() => onRefModeChange('grid')}>
            方格
          </button>
          <button type="button" className={`mini-action ${refMode === 'list' ? 'mini-action-active' : ''}`} onClick={() => onRefModeChange('list')}>
            横格
          </button>
        </div>
      </div>
      <div className="references-layout references-layout-compact">
        <div className={`reference-list reference-list-compact ${refMode === 'list' ? 'reference-list-row' : ''}`}>
          {references.map((item) => (
            <article
              key={item.id}
              className={`reference-card ${selectedRef.id === item.id ? 'reference-card-active' : ''}`}
              onMouseEnter={() => onSelectRef(item)}
            >
              <span className="tag">{item.topic}</span>
              <strong>{item.titleEn}</strong>
              <em>{item.titleZh}</em>
              <small>
                {item.authors} · {item.year} · {item.venue}
              </small>
              <div className="reference-actions">
                <button type="button" className="mini-action mini-action-active" onClick={() => onOpenReference(item)}>
                  打开论文
                </button>
                <button type="button" className="mini-action" onClick={() => onAskAi(item)}>
                  问 AI
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
