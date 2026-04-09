"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockSeries = [
  { week: "W1", value: 2 },
  { week: "W2", value: 4 },
  { week: "W3", value: 3 },
  { week: "W4", value: 6 },
  { week: "W5", value: 8 },
  { week: "W6", value: 7 },
];

export function ActivityTrendChart() {
  return (
    <Card className="rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035),0_10px_24px_-20px_rgba(15,23,42,0.2)] ring-0">
      <CardHeader className="border-b border-zinc-100/90 px-5 pb-4 pt-5 bg-zinc-50/[0.28]">
        <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
          Activity trend (sample)
        </CardTitle>
        <p className="text-[13px] font-normal leading-relaxed text-zinc-600">
          Placeholder curve — real blended timeline + distribution activity will
          replace this as analytics deepen.
        </p>
      </CardHeader>
      <CardContent className="h-[252px] px-5 pb-5 pt-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockSeries} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#18181b" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e4e4e7"
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={32}
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e4e4e7",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#18181b"
              strokeWidth={2}
              fill="url(#momentumFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
