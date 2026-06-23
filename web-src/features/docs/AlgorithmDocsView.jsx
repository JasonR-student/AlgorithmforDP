import { EXPLANATION_TOPICS } from '../../config/explanationTopics.js';
import { formatBytes } from '../../lib/wasmClient.js';

/**
 * 展示可交互算法说明。
 * 用户可以切换主题和步骤，并直接跳转到动画页对照观察。
 */
export default function AlgorithmDocsView({
  docTopic,
  docStep,
  result,
  str1,
  str2,
  onSelectTopic,
  onSelectStep,
  onShowVisual,
  onOpenChat,
}) {
  const activeDocTopic = EXPLANATION_TOPICS.find((item) => item.id === docTopic) || EXPLANATION_TOPICS[0];
  const activeDocStep = activeDocTopic.steps[Math.min(docStep, activeDocTopic.steps.length - 1)];

  return (
    <section className="page-panel page-enter page-enter-slide-right">
      <div className="section-head">
        <div>
          <h1>算法说明</h1>
          <p>用当前输入联动讲解 LCS、SCS、空间优化和复杂度，对应动画页中的每一步。</p>
        </div>
      </div>

      <div className="algorithm-lab">
        <aside className="algorithm-topic-list" role="tablist" aria-label="算法讲解主题">
          {EXPLANATION_TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`algorithm-topic ${docTopic === item.id ? 'algorithm-topic-active' : ''}`}
              onClick={() => onSelectTopic(item.id)}
              role="tab"
              aria-selected={docTopic === item.id}
            >
              <span className="icon-glyph" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <article className="panel-card algorithm-detail">
          <span className="tag">{activeDocTopic.label}</span>
          <h2>{activeDocTopic.title}</h2>
          <p>{activeDocTopic.summary}</p>
          <div className="algorithm-stepper">
            {activeDocTopic.steps.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`mini-action ${docStep === index ? 'mini-action-active' : ''}`}
                onClick={() => onSelectStep(index)}
              >
                第 {index + 1} 步
              </button>
            ))}
          </div>
          <div className="algorithm-step-card">
            <strong>当前讲解</strong>
            <span>{activeDocStep}</span>
          </div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={onShowVisual}>
              去动画中查看
            </button>
            <button type="button" className="btn-secondary" onClick={onOpenChat}>
              展开说明
            </button>
          </div>
        </article>

        <aside className="panel-card algorithm-current">
          <h3>当前样例</h3>
          <dl>
            <div>
              <dt>S1 / S2</dt>
              <dd>{Array.from(str1).length} / {Array.from(str2).length}</dd>
            </div>
            <div>
              <dt>LCS 长度</dt>
              <dd>{result?.lcs?.length ?? '-'}</dd>
            </div>
            <div>
              <dt>SCS 长度</dt>
              <dd>{result?.scs?.length ?? '-'}</dd>
            </div>
            <div>
              <dt>空间优化</dt>
              <dd>{result ? formatBytes(result.lcs.optimizedMemoryBytes) : '-'}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <svg className="flow-svg" viewBox="0 0 760 210" role="img" aria-label="Wasm 动态规划流程图">
        <rect x="30" y="50" width="130" height="54" rx="8" />
        <text x="95" y="83">输入字符串</text>
        <rect x="220" y="50" width="150" height="54" rx="8" />
        <text x="295" y="83">Wasm 填 DP 表</text>
        <rect x="430" y="50" width="130" height="54" rx="8" />
        <text x="495" y="83">回溯路径</text>
        <rect x="620" y="50" width="110" height="54" rx="8" />
        <text x="675" y="83">可视化</text>
        <path d="M160 77H220M370 77H430M560 77H620" />
        <path d="M295 104V150H675V104" />
      </svg>
    </section>
  );
}
