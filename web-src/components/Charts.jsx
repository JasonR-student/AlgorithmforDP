import { useEffect, useMemo, useRef } from 'react';
import { APP_VERSION } from '../config/version.js';

const series = [
  { key: 'standard', label: '标准 DP', color: '#14b8a6', time: 'standardTimeUs', memory: 'standardMemoryBytes' },
  { key: 'optimized', label: '滚动数组', color: '#f59e0b', time: 'optimizedTimeUs', memory: 'optimizedMemoryBytes' },
  { key: 'hirschberg', label: 'Hirschberg', color: '#60a5fa', time: 'hirschbergTimeUs', memory: 'hirschbergMemoryBytes' },
];

const templateRows = [
  {
    length: 200,
    standardTimeUs: 1200,
    optimizedTimeUs: 980,
    hirschbergTimeUs: 1360,
    standardMemoryBytes: 161604,
    optimizedMemoryBytes: 1608,
    hirschbergMemoryBytes: 3216,
    theory: 40000,
  },
  {
    length: 400,
    standardTimeUs: 4400,
    optimizedTimeUs: 3980,
    hirschbergTimeUs: 5200,
    standardMemoryBytes: 643204,
    optimizedMemoryBytes: 3208,
    hirschbergMemoryBytes: 6416,
    theory: 160000,
  },
];

/**
 * 把数字格式化为中文地区的千分位文本。
 * 图表分析和数据表都使用同一格式，避免展示不一致。
 */
function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

/**
 * 把比例数值格式化为固定三位小数的百分比。
 * 空值或非法值统一显示 0.000%，避免报告中出现 NaN。
 */
function formatPercent(value) {
  if (!Number.isFinite(value)) return '0.000%';
  return `${value.toFixed(3)}%`;
}

/**
 * 将性能测试结果转换为 CSV。
 * 字段名保持英文，方便导入 Excel、Python 或其他绘图工具。
 */
function toCsv(rows) {
  const header = [
    'length',
    'standard_time_us',
    'rolling_time_us',
    'hirschberg_time_us',
    'standard_memory_bytes',
    'rolling_memory_bytes',
    'hirschberg_memory_bytes',
    'theory_n2',
  ];
  const body = rows.map((row) =>
    [
      row.length,
      row.standardTimeUs,
      row.optimizedTimeUs,
      row.hirschbergTimeUs,
      row.standardMemoryBytes,
      row.optimizedMemoryBytes,
      row.hirschbergMemoryBytes,
      row.theory,
    ].join(','),
  );
  return [header.join(','), ...body].join('\n');
}

/**
 * 在浏览器中下载文本数据。
 * 通过临时 Blob URL 完成，不需要后端接口。
 */
function download(name, content, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * 绘制所有 canvas 图表共享的背景、坐标轴和标题。
 * 后续图表只需要关心自己的曲线、柱状或散点。
 */
function drawBase(ctx, width, height, title, subtitle = '') {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(58, 40);
  ctx.lineTo(58, height - 46);
  ctx.lineTo(width - 26, height - 46);
  ctx.stroke();
  ctx.fillStyle = '#e8edf2';
  ctx.font = '800 16px Inter, sans-serif';
  ctx.fillText(title, 18, 24);
  if (subtitle) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(subtitle, 18, 40);
  }
}

/**
 * 绘制坐标标签。
 * 这个轻量标签层足够说明课程报告中的横纵轴含义。
 */
function drawLabels(ctx, width, height, rows, maxX, maxY, unit = '') {
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('0', 38, height - 42);
  ctx.fillText(String(maxX), width - 72, height - 26);
  ctx.fillText(`${formatNumber(maxY)}${unit}`, 62, 54);
  if (rows.length) {
    ctx.fillText(`n=${rows[0].length}`, 60, height - 26);
  }
}

/**
 * 绘制时间趋势折线图。
 * 灰色虚线是归一化 O(n²) 参考线，用来对照理论复杂度。
 */
function drawTimeLine(canvas, rows) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  drawBase(ctx, width, height, '耗时趋势折线图', 'X=字符串长度，Y=微秒；灰线为归一化 O(n²) 参考');
  if (!rows.length) return;

  const maxX = Math.max(...rows.map((row) => row.length), 1);
  const maxY = Math.max(...rows.flatMap((row) => series.map((item) => row[item.time] || 0)), 1);
  const x = (row) => 58 + (row.length / maxX) * (width - 92);
  const y = (value) => height - 46 - (value / maxY) * (height - 92);

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  rows.forEach((row, index) => {
    const scaled = (row.theory / Math.max(...rows.map((item) => item.theory || 1))) * maxY;
    if (index === 0) ctx.moveTo(x(row), y(scaled));
    else ctx.lineTo(x(row), y(scaled));
  });
  ctx.stroke();
  ctx.setLineDash([]);

  series.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    rows.forEach((row, index) => {
      if (index === 0) ctx.moveTo(x(row), y(row[item.time]));
      else ctx.lineTo(x(row), y(row[item.time]));
    });
    ctx.stroke();
    rows.forEach((row) => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x(row), y(row[item.time]), 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  drawLabels(ctx, width, height, rows, maxX, maxY, 'us');
}

/**
 * 绘制空间占用分组柱状图。
 * 同一长度下并排比较标准 DP、滚动数组和 Hirschberg。
 */
function drawMemoryBars(canvas, rows) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  drawBase(ctx, width, height, '空间占用分组柱状图', '标准 DP 与线性空间方案在同一长度下的内存差异');
  if (!rows.length) return;

  const max = Math.max(...rows.map((row) => row.standardMemoryBytes || 0), 1);
  const groupWidth = (width - 92) / rows.length;
  rows.forEach((row, index) => {
    const left = 66 + index * groupWidth;
    const barWidth = Math.max(7, groupWidth * 0.16);
    series.forEach((item, seriesIndex) => {
      const heightValue = ((row[item.memory] || 0) / max) * (height - 96);
      ctx.fillStyle = item.color;
      ctx.fillRect(left + seriesIndex * (barWidth + 6), height - 46 - heightValue, barWidth, heightValue);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(String(row.length), left - 2, height - 28);
  });
  drawLabels(ctx, width, height, rows, Math.max(...rows.map((row) => row.length), 1), max, 'B');
}

/**
 * 绘制空间优化比例曲线。
 * 纵轴越低表示相对标准 DP 越省内存。
 */
function drawRatioLine(canvas, rows) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  drawBase(ctx, width, height, '优化比例曲线图', '越低代表相对标准 DP 的空间占用越少');
  if (!rows.length) return;

  const maxX = Math.max(...rows.map((row) => row.length), 1);
  const ratios = rows.flatMap((row) => [
    (row.optimizedMemoryBytes / row.standardMemoryBytes) * 100,
    (row.hirschbergMemoryBytes / row.standardMemoryBytes) * 100,
  ]);
  const maxY = Math.max(...ratios, 1);
  const x = (row) => 58 + (row.length / maxX) * (width - 92);
  const y = (value) => height - 46 - (value / maxY) * (height - 92);

  [
    { key: 'optimizedMemoryBytes', color: '#f59e0b', label: '滚动数组' },
    { key: 'hirschbergMemoryBytes', color: '#60a5fa', label: 'Hirschberg' },
  ].forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    rows.forEach((row, index) => {
      const value = (row[item.key] / row.standardMemoryBytes) * 100;
      if (index === 0) ctx.moveTo(x(row), y(value));
      else ctx.lineTo(x(row), y(value));
    });
    ctx.stroke();
  });
  drawLabels(ctx, width, height, rows, maxX, maxY, '%');
}

/**
 * 绘制效率散点图。
 * X 轴是内存占用，Y 轴是耗时，左下角代表综合表现更好。
 */
function drawEfficiencyScatter(canvas, rows) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  drawBase(ctx, width, height, '效率散点图', 'X=内存占用，Y=耗时；点越靠左下综合效率越好');
  if (!rows.length) return;

  const points = rows.flatMap((row) =>
    series.map((item) => ({
      length: row.length,
      label: item.label,
      color: item.color,
      time: row[item.time] || 0,
      memory: row[item.memory] || 0,
    })),
  );
  const maxMemory = Math.max(...points.map((point) => point.memory), 1);
  const maxTime = Math.max(...points.map((point) => point.time), 1);
  const x = (value) => 58 + (value / maxMemory) * (width - 92);
  const y = (value) => height - 46 - (value / maxTime) * (height - 92);

  points.forEach((point) => {
    ctx.fillStyle = point.color;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(x(point.memory), y(point.time), Math.max(4, Math.min(11, point.length / 130)), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  drawLabels(ctx, width, height, rows, maxMemory, maxTime, 'us');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('memory bytes', width - 100, height - 12);
}

/**
 * 根据性能测试行生成自动分析结论。
 * 这些句子直接服务于报告撰写和现场讲解。
 */
function buildAnalysis(rows) {
  if (!rows.length) {
    return [
      '运行批量性能测试后，本区会自动生成趋势、空间、比例与散点四类分析。',
      '模板区可先下载 CSV 或 JSON 字段模板，用于课程报告或二次绘图。',
    ];
  }

  const last = rows.at(-1);
  const rollingSpace = (last.optimizedMemoryBytes / last.standardMemoryBytes) * 100;
  const hirschbergSpace = (last.hirschbergMemoryBytes / last.standardMemoryBytes) * 100;
  const fastest = series
    .map((item) => ({ label: item.label, time: last[item.time] }))
    .sort((a, b) => a.time - b.time)[0];
  const standardCellCost = last.standardTimeUs / Math.max(1, last.length * last.length);
  const first = rows[0];
  const growth =
    first.standardTimeUs > 0
      ? (last.standardTimeUs / first.standardTimeUs / Math.max(1, (last.length * last.length) / (first.length * first.length))) *
        100
      : 0;

  return [
    `最大长度 ${last.length} 时，标准 DP 空间为 ${formatNumber(last.standardMemoryBytes)} B，滚动数组仅占 ${formatPercent(rollingSpace)}，Hirschberg 约占 ${formatPercent(hirschbergSpace)}。`,
    `该规模下耗时最低的是 ${fastest.label}，耗时 ${formatNumber(fastest.time)} us；标准 DP 单个状态平均成本约 ${standardCellCost.toFixed(5)} us。`,
    `标准 DP 耗时与 n² 参考线的相对增长系数约为 ${growth.toFixed(2)}%，可用于说明实测曲线与 O(nm) 理论趋势的一致性。`,
  ];
}

/**
 * 性能图表总组件。
 * 负责把同一组 rows 同步渲染为四张图、分析结论、模板下载和明细表。
 */
export default function Charts({ rows }) {
  const timeRef = useRef(null);
  const memoryRef = useRef(null);
  const ratioRef = useRef(null);
  const scatterRef = useRef(null);
  const activeRows = rows.length ? rows : templateRows;
  const analysis = useMemo(() => buildAnalysis(rows), [rows]);
  const csv = useMemo(() => toCsv(activeRows), [activeRows]);
  const json = useMemo(() => JSON.stringify(activeRows, null, 2), [activeRows]);

  useEffect(() => {
    if (timeRef.current) drawTimeLine(timeRef.current, activeRows);
    if (memoryRef.current) drawMemoryBars(memoryRef.current, activeRows);
    if (ratioRef.current) drawRatioLine(ratioRef.current, activeRows);
    if (scatterRef.current) drawEfficiencyScatter(scatterRef.current, activeRows);
  }, [activeRows]);

  return (
    <section className="perf-stack">
      <div className="chart-legend" aria-label="图表图例">
        {series.map((item) => (
          <span key={item.key}>
            <i className={`legend-dot dot-${item.key}`} />
            {item.label}
          </span>
        ))}
        <span><i className="legend-line" />O(n²) 参考</span>
      </div>

      <div className="chart-grid chart-grid-quad">
        <canvas ref={timeRef} width="720" height="320" aria-label="耗时趋势折线图" />
        <canvas ref={memoryRef} width="720" height="320" aria-label="空间占用分组柱状图" />
        <canvas ref={ratioRef} width="720" height="320" aria-label="优化比例曲线图" />
        <canvas ref={scatterRef} width="720" height="320" aria-label="效率散点图" />
      </div>

      <div className="perf-insight-grid">
        <article className="panel-card">
          <h3>数据分析结论</h3>
          <ul className="insight-list">
            {analysis.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel-card">
          <div className="card-head compact-head">
            <h3>数据模板</h3>
            <div className="action-row">
              <button type="button" className="mini-action" onClick={() => download(`lcs_scs_perf_template_${APP_VERSION}.csv`, csv, 'text/csv;charset=utf-8')}>
                CSV
              </button>
              <button type="button" className="mini-action" onClick={() => download(`lcs_scs_perf_template_${APP_VERSION}.json`, json, 'application/json;charset=utf-8')}>
                JSON
              </button>
            </div>
          </div>
          <pre className="data-template">{csv}</pre>
        </article>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>长度</th>
              <th>标准 DP us</th>
              <th>滚动数组 us</th>
              <th>Hirschberg us</th>
              <th>标准空间 B</th>
              <th>滚动空间 B</th>
              <th>Hirschberg 空间 B</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <tr key={row.length}>
                <td>{row.length}</td>
                <td>{formatNumber(row.standardTimeUs)}</td>
                <td>{formatNumber(row.optimizedTimeUs)}</td>
                <td>{formatNumber(row.hirschbergTimeUs)}</td>
                <td>{formatNumber(row.standardMemoryBytes)}</td>
                <td>{formatNumber(row.optimizedMemoryBytes)}</td>
                <td>{formatNumber(row.hirschbergMemoryBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
