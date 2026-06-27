import { APP_VERSION } from '../config/version.js';

export default function AppFooter({ compact = false }) {
  return (
    <footer className={`site-footer ${compact ? 'site-footer-standalone' : ''}`}>
      <span>Copyright 2026 任正江 | JasonRhan. All rights reserved. 联系：jasonrhan@agent.qq.com</span>
      <span>
        LCS&SCS Visualizer {APP_VERSION} ·{' '}
        <a href="/release/LCS_SCS_Visualizer_1.1.3.exe" aria-label="本地端下载后续同步">
          本地端下载（后续同步）
        </a>
      </span>
    </footer>
  );
}
