
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Rectangle } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { MonthlyData } from "@/app/page";

interface PerformanceChartProps {
  data: MonthlyData[];
}

const chartConfig = {
  leads: {
    label: "New Leads",
    color: "hsl(var(--chart-1))",
  },
  emails: {
    label: "Emails Sent",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function PerformanceChart({ data }: PerformanceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[350px] w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 p-6">
                <p className="text-sm text-muted-foreground">No data available to display chart.</p>
                <p className="text-xs text-muted-foreground mt-1">Add some leads or send campaigns to see data here.</p>
            </div>
        );
    }

  return (
    <div className="h-[350px] w-full">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart
            data={data}
            margin={{
                top: 20,
                right: 20,
                bottom: 5,
                left: 0,
            }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
           <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="leads"
            fill="var(--color-leads)"
            radius={4}
            activeBar={<Rectangle fill="hsl(var(--chart-1))" opacity={0.75} />}
          />
          <Bar
            dataKey="emails"
            fill="var(--color-emails)"
            radius={4}
            activeBar={<Rectangle fill="hsl(var(--chart-2))" opacity={0.75} />}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
