import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
"recharts";
import { revenueTrend, sourceMix } from "@/data/hs-data";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-foreground)"
  }
};

export function RevenueChart({ height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="m" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`₹${(v / 100000).toFixed(2)} lakh`, "Revenue"]} />
        
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#rev)" />
        
      </AreaChart>
    </ResponsiveContainer>);

}

export function OccupancyChart({ height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={revenueTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="m" {...axis} />
        <YAxis {...axis} unit="%" />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Occupancy"]} />
        <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
      </BarChart>
    </ResponsiveContainer>);

}

const pieColors = [
"var(--color-chart-1)",
"var(--color-chart-2)",
"var(--color-chart-3)",
"var(--color-chart-4)",
"var(--color-chart-5)"];


export function SourceMixChart({ height = 240 }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={sourceMix}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none">
              
              {sourceMix.map((_, i) =>
              <Cell key={i} fill={pieColors[i % pieColors.length]} />
              )}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Share"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 sm:w-1/2">
        {sourceMix.map((s, i) =>
        <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: pieColors[i % pieColors.length] }} />
            
              <span className="truncate">{s.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{s.value}%</span>
          </li>
        )}
      </ul>
    </div>);

}