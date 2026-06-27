import { useEffect, useMemo, useState } from 'react';

const modes = [
  { id: 'fill', label: 'DP 填表', icon: 'DP' },
  { id: 'backtrack-lcs', label: '标准回溯', icon: 'LCS' },
  { id: 'backtrack-scs', label: 'SCS 回溯', icon: 'SCS' },
  { id: 'backtrack-hirschberg', label: 'Hirschberg 回溯', icon: 'HB' },
];

const modeMeta = {
  fill: {
    stage: '二维 DP',
    result: 'LCS 长度表',
    method: '按前缀子问题填表，是 LCS/SCS 后续三种回溯的共同基础。',
  },
  'backtrack-lcs': {
    stage: '标准 LCS',
    result: '公共子序列',
    method: '对应“Maximal Common Subsequence Algorithms”等公共子序列文献：从 dp[m][n] 逆向选择一条公共子序列路径。',
  },
  'backtrack-scs': {
    stage: 'SCS 构造',
    result: '最短公共超序列',
    method: '对应加权 SCS 和极小公共超序列文献：沿 LCS 表回溯，公共字符保留一次，专属字符直接并入。',
  },
  'backtrack-hirschberg': {
    stage: 'Hirschberg',
    result: '线性空间重构',
    method: '对应 Hirschberg 系列文献：二分 S1，用正反向滚动 DP 定位分割点，再递归拼接 LCS。',
  },
};

/**
 * 把 DP 坐标转成 Set 可用的字符串 key。
 * 动画高亮路径时需要快速判断某个单元格是否已经出现。
 */
function cellKey(point) {
  return `${point.i},${point.j}`;
}

/**
 * 构造 DP 填表动画时间线。
 * 前半段补齐第 0 行/列初始化，后半段来自 Wasm 结果的实际填表步骤。
 */
function buildFillTimeline(fillSteps, rows, cols) {
  const init = [];
  for (let j = 0; j < cols; j += 1) {
    init.push({
      phase: 'init',
      i: 0,
      j,
      value: 0,
      rule: `边界初始化：dp[0][${j}]=0，空串与任意前缀的 LCS 长度为 0。`,
    });
  }
  for (let i = 1; i < rows; i += 1) {
    init.push({
      phase: 'init',
      i,
      j: 0,
      value: 0,
      rule: `边界初始化：dp[${i}][0]=0，任意前缀与空串的 LCS 长度为 0。`,
    });
  }
  return [
    ...init,
    ...fillSteps
      .filter((step) => step.i < rows && step.j < cols)
      .map((step) => ({
        ...step,
        phase: 'fill',
        rule:
          step.rule ||
          (step.fromI === step.i - 1 && step.fromJ === step.j - 1
            ? '字符相同：由左上角状态加一。'
            : '字符不同：取上方与左方较大值。'),
      })),
  ];
}

/**
 * 根据当前回溯点和下一个点生成讲解文案。
 * 这个函数把“向左/向上/左上”的移动转成人能读懂的规则说明。
 */
function backtrackRule(result, point, nextPoint) {
  if (!nextPoint) return '回溯结束：路径到达边界，LCS 序列已经确定。';
  const a = result.lcs.str1[point.i - 1];
  const b = result.lcs.str2[point.j - 1];
  if (point.i - nextPoint.i === 1 && point.j - nextPoint.j === 1) {
    return `匹配字符 ${a || b}：加入 LCS，并沿左上方向移动。`;
  }
  if (nextPoint.i < point.i) return '上方状态不小于左方状态：沿上方移动，舍弃 S1 当前字符。';
  return '左方状态更优：沿左方移动，舍弃 S2 当前字符。';
}

/**
 * 构造标准 LCS 回溯动画时间线。
 * 只保留当前展示表格范围内的点，避免超大输入导致界面负担过重。
 */
function buildClassicBacktrackTimeline(result, rows, cols) {
  const path = result?.lcs?.backtrackPath || [];
  return path
    .filter((point) => point.i < rows && point.j < cols)
    .map((point, index, visiblePath) => ({
      ...point,
      phase: 'backtrack-lcs',
      rule: backtrackRule(result, point, visiblePath[index + 1]),
    }));
}

/**
 * 沿 LCS 表反向构造 SCS。
 * 和标准 LCS 回溯不同，遇到非公共字符时不会丢弃，而是并入超序列。
 */
function buildScsBacktrackTimeline(result, rows, cols) {
  const table = result?.lcs?.dpTable || [];
  const str1 = result?.lcs?.str1 || '';
  const str2 = result?.lcs?.str2 || '';
  const steps = [];
  let i = Array.from(str1).length;
  let j = Array.from(str2).length;
  const aChars = Array.from(str1);
  const bChars = Array.from(str2);

  while (i > 0 || j > 0) {
    const point = { i, j };
    if (i === 0) {
      const ch = bChars[j - 1];
      steps.push({
        ...point,
        phase: 'backtrack-scs',
        ch,
        source: 's2',
        rule: `S1 已到边界：把 S2 剩余字符 ${ch} 放入 SCS，并向左移动。`,
      });
      j -= 1;
      continue;
    }
    if (j === 0) {
      const ch = aChars[i - 1];
      steps.push({
        ...point,
        phase: 'backtrack-scs',
        ch,
        source: 's1',
        rule: `S2 已到边界：把 S1 剩余字符 ${ch} 放入 SCS，并向上移动。`,
      });
      i -= 1;
      continue;
    }

    const a = aChars[i - 1];
    const b = bChars[j - 1];
    if (a === b) {
      steps.push({
        ...point,
        phase: 'backtrack-scs',
        ch: a,
        source: 'common',
        rule: `公共字符 ${a}：SCS 中只保留一次，沿左上方向回溯。`,
      });
      i -= 1;
      j -= 1;
      continue;
    }

    const up = table[i - 1]?.[j] ?? 0;
    const left = table[i]?.[j - 1] ?? 0;
    if (up >= left) {
      steps.push({
        ...point,
        phase: 'backtrack-scs',
        ch: a,
        source: 's1',
        rule: `dp[i-1][j] 不小于 dp[i][j-1]：保留 S1 字符 ${a}，继续向上回溯。`,
      });
      i -= 1;
    } else {
      steps.push({
        ...point,
        phase: 'backtrack-scs',
        ch: b,
        source: 's2',
        rule: `左侧状态更适合保持公共结构：保留 S2 字符 ${b}，继续向左回溯。`,
      });
      j -= 1;
    }
  }

  return steps.filter((point) => point.i < rows && point.j < cols);
}

function locateSequencePath(str1 = '', str2 = '', sequence = '') {
  const aChars = Array.from(str1);
  const bChars = Array.from(str2);
  let i = 0;
  let j = 0;
  return Array.from(sequence).map((ch) => {
    while (i < aChars.length && aChars[i] !== ch) i += 1;
    while (j < bChars.length && bChars[j] !== ch) j += 1;
    const point = { i: Math.min(i + 1, aChars.length), j: Math.min(j + 1, bChars.length), ch };
    i += 1;
    j += 1;
    return point;
  });
}

/**
 * 构造 Hirschberg 讲解时间线。
 * Wasm 返回最终序列，这里把序列映射回表格坐标，用动画展示二分、双向滚动 DP 和递归拼接的核心过程。
 */
function buildHirschbergTimeline(result, rows, cols) {
  const sequence = result?.lcs?.hirschbergSequence || result?.lcs?.sequence || '';
  const points = locateSequencePath(result?.lcs?.str1, result?.lcs?.str2, sequence);
  return points
    .filter((point) => point.i < rows && point.j < cols)
    .map((point, index) => ({
      ...point,
      phase: 'backtrack-hirschberg',
      rule: `Hirschberg 输出第 ${index + 1} 个字符 ${point.ch}：二分 S1 后用正反向滚动 DP 定位分割点，再在子问题中完成匹配。`,
    }));
}

/**
 * 将 SCS 来源代码转成面向用户的中文标签。
 * title 提示会使用它说明当前字符来自哪里。
 */
function getSourceLabel(source) {
  if (source === 'common') return '公共字符';
  if (source === 's1') return 'S1 专属';
  return 'S2 专属';
}

function getStageLabel(mode, current, step, timelines) {
  if (mode === 'backtrack-scs') return `SCS 回溯第 ${Math.min(step + 1, timelines['backtrack-scs'].length)} 步`;
  if (mode === 'backtrack-hirschberg') return `Hirschberg 匹配第 ${Math.min(step + 1, timelines['backtrack-hirschberg'].length)} 步`;
  if (current) return `dp[${current.i}][${current.j}]`;
  return '无';
}

/**
 * 动态规划动画组件。
 * 支持 DP 填表、标准 LCS 回溯、SCS 回溯和 Hirschberg 线性空间回溯。
 */
export default function DpVisualizer({ result, onOpenStandalone, standalone = false }) {
  const [mode, setMode] = useState('fill');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(420);

  const lcs = result?.lcs;
  const table = lcs?.dpTable || [];
  const rows = Math.min(table.length, 70);
  const cols = Math.min(table[0]?.length || 0, 70);

  const timelines = useMemo(() => {
    if (!result || !table.length) {
      return { fill: [], 'backtrack-lcs': [], 'backtrack-scs': [], 'backtrack-hirschberg': [] };
    }
    return {
      fill: buildFillTimeline(lcs.fillSteps || [], rows, cols),
      'backtrack-lcs': buildClassicBacktrackTimeline(result, rows, cols),
      'backtrack-scs': buildScsBacktrackTimeline(result, rows, cols),
      'backtrack-hirschberg': buildHirschbergTimeline(result, rows, cols),
    };
  }, [cols, lcs, result, rows, table.length]);

  const timeline = timelines[mode] || [];
  const maxStep = Math.max(0, timeline.length - 1);
  const current = timeline[Math.min(step, maxStep)];
  const max = Math.max(1, lcs?.length || 1);
  const meta = modeMeta[mode] || modeMeta.fill;

  const revealedFill = useMemo(() => {
    if (mode !== 'fill') return new Set();
    return new Set(timeline.slice(0, step + 1).filter((item) => Number.isFinite(item.i)).map(cellKey));
  }, [mode, step, timeline]);

  const revealedPath = useMemo(() => {
    if (mode === 'fill') return new Set();
    return new Set(timeline.slice(0, step + 1).filter((item) => Number.isFinite(item.i)).map(cellKey));
  }, [mode, step, timeline]);

  const constructedScs = useMemo(() => {
    if (mode !== 'backtrack-scs') return '';
    return timeline
      .slice(0, step + 1)
      .filter((item) => item.ch)
      .map((item) => item.ch)
      .reverse()
      .join('');
  }, [mode, step, timeline]);

  const hirschbergPrefix = useMemo(() => {
    if (mode !== 'backtrack-hirschberg') return '';
    return timeline
      .slice(0, step + 1)
      .filter((item) => item.ch)
      .map((item) => item.ch)
      .join('');
  }, [mode, step, timeline]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setStep((value) => {
        if (value >= maxStep) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [maxStep, playing, speed]);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [mode, result]);

  if (!result) return <div className="empty-state">等待输入数据。</div>;
  if (!table.length) {
    return (
      <div className="panel-card">
        <h3>DP 表摘要</h3>
        <p>当前输入规模较大，二维 DP 已完成计算；完整表格在展示层折叠，以保持页面交互流畅。</p>
      </div>
    );
  }

  return (
    <section className="visual-stack">
      <div className="section-head">
        <div>
          <h2>动态规划可视化动画</h2>
          <p>从边界 0 状态开始构建 DP 表，并演示标准 LCS、SCS 与 Hirschberg 三种回溯路径。</p>
        </div>
        <div className="action-row">
          {onOpenStandalone ? (
            <button type="button" className="btn-primary" onClick={onOpenStandalone}>
              <span className="icon-glyph" aria-hidden="true">↗</span>
              新页面查看
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={() => setStep(0)}>
            <span className="icon-glyph" aria-hidden="true">R</span>
            {standalone ? '重置步骤' : '重载动画'}
          </button>
        </div>
      </div>

      <div className="mode-tabs" role="tablist" aria-label="动画模式">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mini-action ${mode === item.id ? 'mini-action-active' : ''}`}
            onClick={() => setMode(item.id)}
            role="tab"
            aria-selected={mode === item.id}
          >
            <span className="icon-glyph" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button type="button" className="mini-action" onClick={() => setStep((value) => Math.max(0, value - 1))}>
          上一步
        </button>
        <button type="button" className="mini-action mini-action-active" onClick={() => setPlaying((value) => !value)}>
          {playing ? '暂停' : '自动播放'}
        </button>
        <button type="button" className="mini-action" onClick={() => setStep((value) => Math.min(maxStep, value + 1))}>
          下一步
        </button>
        <input type="range" min="0" max={maxStep} value={step} onChange={(event) => setStep(Number(event.target.value))} />
        <span className="tag">
          {Math.min(step + 1, maxStep + 1)} / {maxStep + 1}
        </span>
        <label className="speed-control">
          速度
          <input type="range" min="140" max="900" step="20" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
      </div>

      <div className="animation-explainer">
        <div>
          <strong>当前步骤</strong>
          <span>{current?.rule || '当前输入没有可演示步骤。'}</span>
        </div>
        <div>
          <strong>坐标/阶段</strong>
          <span>{getStageLabel(mode, current, step, timelines)}</span>
        </div>
        <div>
          <strong>{meta.result}</strong>
          <span>
            {mode === 'backtrack-scs'
              ? constructedScs || '等待构造'
              : mode === 'backtrack-hirschberg'
                ? hirschbergPrefix || '等待匹配'
                : result.lcs.sequence || '空串'}
          </span>
        </div>
        <div>
          <strong>文献方法</strong>
          <span>{meta.method}</span>
        </div>
      </div>

      {mode === 'backtrack-scs' ? (
        <div className="scs-construction" aria-label="SCS 回溯取字符顺序">
          {timelines['backtrack-scs'].map((item, index) => (
            <span
              key={`${item.ch}-${index}`}
              className={`char-token ${index <= step ? item.source : 'pending-char'} ${index === step ? 'active-char' : ''}`}
              title={`${getSourceLabel(item.source)}：${item.ch}`}
            >
              {index <= step ? item.ch : ''}
            </span>
          ))}
        </div>
      ) : null}

      <div className="dp-table-wrap">
        <table className="dp-table">
          <thead>
            <tr>
              <th>i/j</th>
              {Array.from({ length: cols }, (_, j) => (
                <th key={j}>{j ? result.lcs.str2[j - 1] : '∅'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                <th>{i ? result.lcs.str1[i - 1] : '∅'}</th>
                {Array.from({ length: cols }, (_, j) => {
                  const value = table[i][j];
                  const key = `${i},${j}`;
                  const isKnown = mode === 'fill' ? revealedFill.has(key) : true;
                  const alpha = isKnown ? 0.08 + (0.52 * value) / max : 0.02;
                  const isPath = mode !== 'fill' && revealedPath.has(key);
                  const isActive = current?.i === i && current?.j === j;
                  return (
                    <td
                      key={`${i}-${j}`}
                      className={`${isPath ? 'path-cell' : ''} ${isActive ? 'active-cell' : ''} ${isKnown ? '' : 'pending-cell'}`}
                      style={{ background: `rgba(20, 184, 166, ${alpha})` }}
                      title={isKnown ? `dp[${i}][${j}]=${value}` : `dp[${i}][${j}] 尚未计算`}
                    >
                      {isKnown ? value : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
