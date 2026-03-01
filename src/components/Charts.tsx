import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data defined internally for chart components
const performanceData = [
  { name: 'Mon', engagement: 400, reach: 240 },
  { name: 'Tue', engagement: 300, reach: 139 },
  { name: 'Wed', engagement: 600, reach: 980 },
  { name: 'Thu', engagement: 800, reach: 390 },
  { name: 'Fri', engagement: 500, reach: 480 },
  { name: 'Sat', engagement: 900, reach: 380 },
  { name: 'Sun', engagement: 1100, reach: 430 },
];

const revenueData = [
  { month: 'Jan', revenue: 4500, target: 4000 },
  { month: 'Feb', revenue: 5200, target: 4500 },
  { month: 'Mar', revenue: 4800, target: 5000 },
  { month: 'Apr', revenue: 6100, target: 5500 },
  { month: 'May', revenue: 5900, target: 6000 },
  { month: 'Jun', revenue: 7200, target: 6500 },
];

const growthData = [
  { month: 'Jan', total: 10, new: 2 },
  { month: 'Feb', total: 14, new: 4 },
  { month: 'Mar', total: 18, new: 4 },
  { month: 'Apr', total: 25, new: 7 },
  { month: 'May', total: 32, new: 7 },
  { month: 'Jun', total: 40, new: 8 },
];

const projectStatusData = [
  { name: 'Social Media', value: 45 },
  { name: 'Web Dev', value: 25 },
  { name: 'SEO/Ads', value: 20 },
  { name: 'Email Marketing', value: 10 },
];

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-lg backdrop-blur-md">
        <p className="text-sm font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ data }: { data?: Array<{ name: string; engagement: number; reach: number }> }) {
  const chartData = data && data.length ? data : performanceData;

  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardHeader>
        <CardTitle>Agency Performance</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEng)"
            />
            <Area
              type="monotone"
              dataKey="reach"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueChart() {
  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardHeader>
        <CardTitle>Monthly Revenue Growth</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
            <Legend />
            <Bar
              dataKey="revenue"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              barSize={32}
              name="Actual Revenue"
            />
            <Bar
              dataKey="target"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
              barSize={32}
              name="Target Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ClientGrowthChart() {
  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardHeader>
        <CardTitle>Client Acquisition</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="stepAfter"
              dataKey="total"
              stroke="var(--chart-1)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--chart-1)' }}
              activeDot={{ r: 6 }}
              name="Total Clients"
            />
            <Line
              type="monotone"
              dataKey="new"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="New Monthly"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProjectChart() {
  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardHeader>
        <CardTitle>Service Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={projectStatusData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {projectStatusData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
