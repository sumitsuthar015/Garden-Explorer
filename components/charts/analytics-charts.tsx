"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

/**
 * Responsive chart wrappers.
 *
 * Every chart is built from real aggregate rows and shows an explicit empty
 * state instead of a misleading flat line when there is no data yet.
 */

const PALETTE = ["#2F6B4F", "#6F9B73", "#E7B75B", "#3E7A8C", "#8C6F3E", "#5C7A9E"];

const AXIS_STYLE = {
  fontSize: 12,
  fill: "#5B6A62",
} as const;

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}

export function ScansOverTimeChart({
  data,
}: {
  data: { day: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        className="border-0 py-8"
        icon={<BarChart3 className="size-5" aria-hidden />}
        title="Not enough activity yet"
        description="Analytics will appear here after visitors begin scanning garden signs."
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E8DE" />
          <XAxis
            dataKey="day"
            tick={AXIS_STYLE}
            tickFormatter={(value: string) => value.slice(5)}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis tick={AXIS_STYLE} allowDecimals={false} width={44} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #DFE4D9",
              fontSize: 12,
              background: "#FFFFFF",
            }}
            formatter={(value) => [formatNumber(Number(value ?? 0)), "Scans"]}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#2F6B4F"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  valueLabel,
}: {
  data: { label: string; total: number }[];
  valueLabel: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        className="border-0 py-8"
        icon={<BarChart3 className="size-5" aria-hidden />}
        title="No activity yet"
        description="This chart fills in once visitors start using the QR signs."
      />
    );
  }

  const height = Math.max(200, data.length * 44);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E8DE" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={AXIS_STYLE} width={140} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #DFE4D9",
              fontSize: 12,
              background: "#FFFFFF",
            }}
            formatter={(value) => [formatNumber(Number(value ?? 0)), valueLabel]}
          />
          <Bar dataKey="total" fill="#2F6B4F" radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SharePieChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        className="border-0 py-8"
        icon={<BarChart3 className="size-5" aria-hidden />}
        title="No data yet"
        description="Share breakdown appears after the first recorded events."
      />
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="label"
            innerRadius="46%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={48}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: "#1F2933" }}>{value}</span>
            )}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #DFE4D9",
              fontSize: 12,
              background: "#FFFFFF",
            }}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
