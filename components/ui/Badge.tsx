import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "green" | "yellow" | "red" | "gray" | "blue";

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-50 text-blue-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
