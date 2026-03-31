import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  const variants: Record<string, string> = {
    idle: "bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
    busy: "bg-warning/10 text-warning border-warning/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]",
    active: "bg-warning/10 text-warning border-warning/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]",
    error: "bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
    failed: "bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
    completed: "bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
    queued: "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]",
    waiting: "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]",
  };

  const defaultVariant = "bg-muted text-muted-foreground border-border";
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm uppercase tracking-wider",
      variants[normalized] || defaultVariant
    )}>
      {status}
    </span>
  );
}
