import AIChatBot from '../../components/AIChatBot.jsx';

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
          <iframe className="pdf-frame reference-pdf-frame" src={reference.href} title={reference.titleZh} />
        </section>

        <aside className="reference-ai-panel">
          <AIChatBot
            inline
            context={context}
            title="论文问答"
            subtitle="可查看来源、核心内容和基础实现"
            initialMode="文献讲解"
            quickPrompts={['这篇论文从哪里来？', '它主要讲了什么？', '基础代码怎么实现？']}
          />
        </aside>
      </main>
    </div>
  );
}
