import AIChatBot from '../../components/AIChatBot.jsx';
import AppFooter from '../../components/AppFooter.jsx';

/**
 * 独立文献阅读页。
 * 左侧负责 PDF 阅读，右侧围绕当前论文回答来源、内容和实现问题。
 */
export default function ReferenceReaderPage({ reference, context }) {
  return (
    <div className="standalone-page reference-reader-page">
      <header className="standalone-header">
        <div>
          <strong>参考文献阅读</strong>
          <span>{reference.titleZh}</span>
        </div>
        <a className="btn-secondary" href="./?tab=refs">
          返回文献列表
        </a>
      </header>

      <main className="reference-reader-layout">
        <section className="reference-pdf-panel">
          <div className="reader-paper-head">
            <span className="tag">{reference.topic}</span>
            <h1>{reference.titleEn}</h1>
            <p>{reference.titleZh}</p>
            <small>
              {reference.authors} · {reference.year} · {reference.venue}
            </small>
            <div className="action-row">
              <a className="btn-secondary" href={reference.href} target="_blank" rel="noreferrer">
                单独打开 PDF
              </a>
            </div>
          </div>
          <div className="reference-method-panel">
            <strong>文献方法在本页的使用</strong>
            <p>{reference.methodUse}</p>
            <ul>
              {(reference.methodSteps || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <iframe className="pdf-frame reference-pdf-frame" src={reference.href} title={reference.titleZh} />
        </section>

        <aside className="reference-ai-panel">
          <AIChatBot
            inline
            context={context}
            title="论文阅读助手"
            subtitle="已接入 PDF、页面内容和算法状态"
            initialMode="文献讲解"
            quickPrompts={['这篇论文的方法用在了哪里？', '按当前 PDF 说明核心思路', '和页面动画怎么对应？']}
          />
        </aside>
      </main>
      <AppFooter compact />
    </div>
  );
}
