"use client";

import { useEffect, useState } from "react";
import Skeleton from "@/app/_components/Skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <Skeleton className="h-64 w-full rounded-lg" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="scan_count" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
