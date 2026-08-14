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

  if (error) return <p className="text-sm font-semibold text-accent-700">{error}</p>;
  if (!data) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <defs>
            <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec3013" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#ec3013" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,30,29,0.16)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7d7979" }} tickLine={false} axisLine={{ stroke: "rgba(32,30,29,0.4)" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7d7979" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{ borderRadius: 0, border: "2px solid rgba(32,30,29,0.4)", background: "#f3f2f2", fontSize: 12 }}
            labelStyle={{ color: "#7d7979" }}
            cursor={{ stroke: "#ec3013", strokeOpacity: 0.35 }}
          />
          <Area type="monotone" dataKey="scan_count" stroke="#ec3013" strokeWidth={2} fill="url(#scanFill)" dot={false} activeDot={{ r: 4, fill: "#ec3013" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
