"use client";

import { useEffect, useState } from "react";
import Skeleton from "@/app/_components/Skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { day: string; scan_count: number };

// Build a zero-filled series for the last `days` so the chart is continuous.
function fill(series: Point[], days: number): Point[] {
  const byDay = new Map(series.map((p) => [p.day, Number(p.scan_count)]));
  const out: Point[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key.slice(5), scan_count: byDay.get(key) ?? 0 });
  }
  return out;
}

export default function ScanChart({ qrId }: { qrId: string }) {
  const days = 30;
  const [data, setData] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/qrcodes/${qrId}/analytics?days=${days}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        return res.json();
      })
      .then((body) => {
        if (active) setData(fill(body.series ?? [], days));
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [qrId]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <defs>
            <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,16,40,0.08)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8b8b97" }} tickLine={false} axisLine={{ stroke: "#ececf1" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8b8b97" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #ececf1", boxShadow: "var(--shadow-pop)", fontSize: 12 }}
            labelStyle={{ color: "#8b8b97" }}
            cursor={{ stroke: "#4f46e5", strokeOpacity: 0.25 }}
          />
          <Area type="monotone" dataKey="scan_count" stroke="#4f46e5" strokeWidth={2} fill="url(#scanFill)" dot={false} activeDot={{ r: 4, fill: "#4f46e5" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
