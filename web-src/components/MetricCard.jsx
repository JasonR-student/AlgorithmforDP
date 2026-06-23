/**
 * 渲染核心指标卡片。
 * 这个组件只关心数值、标题和补充说明，方便核心结果页和未来统计面板复用。
 */
export default function MetricCard({ label, value, note }) {
  return (
    <div className="metric-card">
      <b>{value}</b>
      <span>{label}</span>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
