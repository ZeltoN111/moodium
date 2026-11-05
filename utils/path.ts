export type Point = { x: number; y: number };

const r = (value: number) => Math.round(value * 10) / 10;

/**
 * Smooth SVG path through every point (Catmull-Rom converted to cubic Béziers).
 * The curve passes exactly through each point, so peaks stay where the data is.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${r(points[0].x)} ${r(points[0].y)}`;

  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

/** Same curve, closed down to `baseline` so it can be filled as an area. */
export function areaPath(points: Point[], baseline: number): string {
  if (points.length < 2) return '';
  const last = points[points.length - 1];
  return `${smoothPath(points)} L${r(last.x)} ${r(baseline)} L${r(points[0].x)} ${r(baseline)} Z`;
}

/** Maps 1..5 mood values (null = no entry) onto chart coordinates, skipping gaps. */
export function moodPoints(values: (number | null)[], width: number, height: number, pad = 8): Point[] {
  return scalePoints(values, width, height, 1, 5, pad);
}

/** Maps values on a [min, max] scale onto chart coordinates (max at the top), skipping nulls. */
export function scalePoints(
  values: (number | null)[],
  width: number,
  height: number,
  min: number,
  max: number,
  pad = 8
): Point[] {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const span = max - min || 1;
  const points: Point[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    const clamped = Math.min(max, Math.max(min, value));
    points.push({ x: index * step, y: pad + ((max - clamped) * (height - 2 * pad)) / span });
  });
  return points;
}

/** Length of the polyline through the points; a close stand-in for the smooth curve's length. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** Index of the value slot closest to x on a chart `width` wide with `count` evenly spaced slots. */
export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  const step = width / (count - 1);
  return Math.min(count - 1, Math.max(0, Math.round(x / step)));
}
