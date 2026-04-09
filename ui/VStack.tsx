import React from "react";

// -----------------------------
// 🎯 Types
// -----------------------------
type Justify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";

type Align =
  | "start"
  | "center"
  | "end"
  | "stretch"
  | "baseline";

interface StackProps
  extends React.HTMLAttributes<HTMLDivElement> {
  gap?: number;
  justify?: Justify;
  align?: Align;
}

// -----------------------------
// 🧠 Maps (Tailwind-safe)
// -----------------------------
const justifyMap: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const alignMap: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const gapMap: Record<number, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
};

// -----------------------------
// 🧱 Component
// -----------------------------
export function VStack({
  gap = 2,
  justify = "start",
  align = "start",
  className = "",
  style,
  ...props
}: StackProps) {
  const gapClass = gapMap[gap];

  return (
    <div
      className={`flex flex-col ${gapClass ?? ""} ${justifyMap[justify]} ${alignMap[align]} ${className}`}
      style={gapClass ? style : { gap, ...style }} // ✅ fallback for custom gaps
      {...props}
    />
  );
}

