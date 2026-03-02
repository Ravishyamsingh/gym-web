import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-white/10 text-light",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    blocked: "bg-blood/20 text-blood border-blood/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    expired: "bg-white/5 text-white/50 border-white/10",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
