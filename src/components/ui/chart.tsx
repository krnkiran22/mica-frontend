"use client"

import * as React from "react"
import { ResponsiveContainer, Tooltip, type TooltipProps } from "recharts"
import { cn } from "@/lib/utils"

interface ChartConfig {
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("h-[350px] w-full", className)} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    )
  },
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { payload?: TooltipProps<any, any>["payload"] }
>(({ className, payload, ...props }, ref) => {
  const formattedValue = payload?.[0]?.value?.toLocaleString() ?? "0"
  const name = payload?.[0]?.name
  const category = payload?.[0]?.payload?.category

  return (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-background px-3 py-1.5 text-sm shadow-md", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{category ?? name}</span>
        <span className="ml-4 font-semibold">{formattedValue}</span>
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartTooltip = React.forwardRef<React.ElementRef<typeof Tooltip>, React.ComponentPropsWithoutRef<typeof Tooltip>>(
  ({ content, ...props }, ref) => (
    <Tooltip
      ref={ref}
      content={<ChartTooltipContent />}
      {...props}
      cursor={{ fill: "var(--muted)" }}
      wrapperStyle={{ outline: "none" }}
    />
  ),
)
ChartTooltip.displayName = "ChartTooltip"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
