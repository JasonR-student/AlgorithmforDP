const navItems = [
  ['core', '核心结果', 'R'],
  ['visual', '可视化动画', 'D'],
  ['perf', '效率分析', 'P'],
  ['docs', '算法说明', 'A'],
  ['refs', '参考文献', 'PDF'],
];

/**
 * Renders the top navigation bar and keeps page switching in one place.
 * The component is intentionally small because each tab's actual content lives in a feature file.
 */
export default function Navbar({ active, onChange, onOpenChat }) {
  return (
    <header className="site-header">
      <nav className="site-nav">
        <button type="button" className="brand" onClick={() => onChange('core')} aria-label="回到核心结果">
          <span className="brand-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" role="img" focusable="false">
              <path d="M11 14.5C15.4 11.8 19.9 11 24 12.2C28.1 11 32.6 11.8 37 14.5V35.8C32.8 33.2 28.4 32.4 24 33.8C19.6 32.4 15.2 33.2 11 35.8V14.5Z" />
              <path d="M24 12.2V33.8" />
              <path d="M16 19.2H21" />
              <path d="M16 24H21" />
              <path d="M27 19.2H32" />
              <path d="M27 24H32" />
            </svg>
          </span>
          <span>
            <strong>LCS&SCS Visualizer</strong>
            <small>WebAssembly Algorithm Lab</small>
          </span>
        </button>

        <div className="nav-links" role="tablist" aria-label="主导航">
          {navItems.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={`nav-link ${active === id ? 'nav-link-active' : ''}`}
              onClick={() => onChange(id)}
              role="tab"
              aria-selected={active === id}
            >
              <span className="icon-glyph" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="btn-secondary" onClick={onOpenChat}>
          <span className="icon-glyph" aria-hidden="true">AI</span>
          <span>AI 助手</span>
        </button>
      </nav>
    </header>
  );
}
