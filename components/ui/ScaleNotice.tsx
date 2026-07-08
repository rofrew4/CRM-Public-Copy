import { cn } from "@/lib/utils";
import type { ScaleNoticeLevel } from "@/lib/scale-hints";

export function ScaleNotice({
  level,
  message,
  className,
}: {
  level: ScaleNoticeLevel;
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        level === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-gray-200 bg-gray-50 text-gray-600",
        className
      )}
    >
      {message}
    </p>
  );
}
