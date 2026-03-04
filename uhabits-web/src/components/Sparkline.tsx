export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="sparkline-empty">No data yet</div>;
  }

  const width = 220;
  const height = 64;
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values);
  const range = Math.max(max - min, 0.0001);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
