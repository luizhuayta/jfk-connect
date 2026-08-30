"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_DATA = [
  { name: "Lun", value: 96 },
  { name: "Mar", value: 94 },
  { name: "Mié", value: 97 },
  { name: "Jue", value: 95 },
  { name: "Vie", value: 98 },
  { name: "Sáb", value: 92 },
];

export default function AttendanceChart({
  data = DEFAULT_DATA,
}: {
  data?: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
        />
        <Bar dataKey="value" fill="#1E2A5E" radius={[6, 6, 0, 0]} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
