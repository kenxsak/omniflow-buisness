"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { Lead } from "@/lib/mock-data"


interface LeadStatusChartProps {
  data: { status: Lead['status']; count: number }[];
}

const chartConfig = {
  count: {
    label: "Leads",
    color: "hsl(var(--chart-1))", // Use primary chart color
  },
  New: { color: "hsl(var(--chart-1))" },
  Contacted: { color: "hsl(var(--chart-2))" },
  Qualified: { color: "hsl(var(--chart-3))" },
  Won: { color: "hsl(var(--chart-4))" },
  Lost: { color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

export default function LeadStatusChart({ data }: LeadStatusChartProps) {
    // Dynamically assign fill colors based on status from chartConfig
    const chartDataWithFill = data.map(item => ({
        ...item,
        fill: chartConfig[item.status]?.color || chartConfig.count.color, // Fallback to default color
    }));


  return (
      <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
        <BarChart
          accessibilityLayer
          data={chartDataWithFill}
          layout="vertical"
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
        >
          <CartesianGrid horizontal={false} />
           <YAxis
            dataKey="status"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value} // Display status names directly
            className="text-xs"
          />
          <XAxis dataKey="count" type="number" hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" hideLabel />}
          />
          <Bar dataKey="count" radius={5}>
             <LabelList
                position="right"
                offset={8}
                className="fill-foreground text-xs"
                formatter={(value: number) => value.toLocaleString()}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
  )
}
