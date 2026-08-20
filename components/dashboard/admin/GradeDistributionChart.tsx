"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_DATA = [
  { name: "AD (18-20)", value: 20 },
  { name: "A (16-17)", value: 30 },
  { name: "B (11-15)", value: 40 },
  { name: "C (0-10)", value: 10 },
];

const COLORS = ["#1E2A5E", "#2C3A7A", "#F4C15C", "#94a3b8"];

export default function GradeDistributionChart({
  data = DEFAULT_DATA,
}: {
  data?: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          fill="#8884d8"
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          formatter={(value) => [`${value}%`, "Porcentaje"]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value: string) => (
            <span style={{ color: "#64748b", fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
