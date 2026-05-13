import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  deltaClass,
  formatDeltaNumber,
  formatDeltaPercent,
  formatDeltaPosition,
} from "@/lib/format";

type DeltaProps = {
  value: number;
  type?: "number" | "percent" | "position";
  digits?: number;
  lowerIsBetter?: boolean;
  hideArrow?: boolean;
};

export function Delta({
  value,
  type = "number",
  digits,
  lowerIsBetter = false,
  hideArrow = false,
}: DeltaProps) {
  if (!Number.isFinite(value)) {
    return <span className="text-muted text-xs">—</span>;
  }

  const formatted =
    type === "percent"
      ? formatDeltaPercent(value, digits ?? 2)
      : type === "position"
      ? formatDeltaPosition(value, digits ?? 1)
      : formatDeltaNumber(value, digits ?? 0);

  const isZero = Math.abs(value) < (type === "percent" ? 0.00005 : 0.05);
  const cls = isZero ? "text-muted" : deltaClass(value, lowerIsBetter);

  const Icon = isZero ? Minus : value > 0 ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${cls}`}>
      {!hideArrow && <Icon className="w-3 h-3" />}
      {formatted}
    </span>
  );
}
