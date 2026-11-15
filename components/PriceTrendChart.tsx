"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

export default function PriceTrendChart({
  data,
}: {
  data: Record<string, any>[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Belum ada data tren harga tangkapan.
      </div>
    );
  }

  // Deteksi jenis ikan secara dinamis dari key data
  const speciesKeys = Array.from(
    new Set(
      data.flatMap((item) => Object.keys(item).filter((k) => k !== "date")),
    ),
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}rb`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              color: "#f8fafc",
            }}
            formatter={(value: number) => [
              `Rp ${value.toLocaleString("id-ID")}/kg`,
              "",
            ]}
          />
          <Legend />
          {speciesKeys.map((species, idx) => (
            <Line
              key={species}
              type="monotone"
              dataKey={species}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
