/** A tiny trend line for the price board. Needs two or more points; otherwise it draws a flat dash. */
export function Sparkline({ points, width = 110, height = 28 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2)
    return (
      <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--color-line)" strokeWidth="2" strokeDasharray="3 4" />
      </svg>
    );
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * width, height - 3 - ((p - lo) / span) * (height - 6)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const falling = points[points.length - 1] < points[0];
  const colour = falling ? "var(--color-down)" : "var(--color-up)";
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg className="spark draw" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={colour} opacity="0.08" />
      <path className="line" pathLength={1} d={d} fill="none" stroke={colour} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.6" fill={colour} />
    </svg>
  );
}
