
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

export interface EmailChartData {
    name: string;
    sent: number;
    opened: number;
    clicked: number;
}

interface EmailPerformanceChartProps {
  data: EmailChartData[];
}

const chartConfig = {
  sent: {
    label: "Sent",
    color: "hsl(var(--chart-1))",
  },
  opened: {
    label: "Opened",
    color: "hsl(var(--chart-2))",
  },
  clicked: {
    label: "Clicked",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export default function EmailPerformanceChart({ data }: EmailPerformanceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 p-6">
                <p className="text-sm text-muted-foreground">No sent campaign data available to display chart.</p>
                <p className="text-xs text-muted-foreground mt-1">Send a campaign to see performance data here.</p>
            </div>
        );
    }

  return (
    <div className="h-full w-full">
      <ChartContainer config={chartConfig} className="w-full h-full min-h-[300px]">
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
            tickFormatter={(value) => value.slice(0, 15) + (value.length > 15 ? '...' : '')} // Truncate long campaign names
          />
          <YAxis />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
           <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="sent"
            fill="var(--color-sent)"
            radius={4}
          />
          <Bar
            dataKey="opened"
            fill="var(--color-opened)"
            radius={4}
          />
           <Bar
            dataKey="clicked"
            fill="var(--color-clicked)"
            radius={4}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
