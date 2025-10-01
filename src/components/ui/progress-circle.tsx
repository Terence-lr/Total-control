"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressCircleProps extends React.SVGProps<SVGSVGElement> {
  value?: number;
  max?: number;
}

const ProgressCircle = React.forwardRef<SVGSVGElement, ProgressCircleProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, value / max));
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <svg
        ref={ref}
        className={cn("w-full h-full", className)}
        viewBox="0 0 100 100"
        {...props}
      >
        <circle
          className="text-border"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="text-accent"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (1 - progress))}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 0.5s ease-out",
          }}
        />
      </svg>
    );
  }
);
ProgressCircle.displayName = "ProgressCircle";

export { ProgressCircle };
