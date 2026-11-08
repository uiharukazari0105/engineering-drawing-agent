import { cva, type VariantProps } from "class-variance-authority";

export { default as Badge } from "./Badge.vue";

export const badgeVariants = cva(
  "inline-flex h-5 items-center whitespace-nowrap rounded-[3px] border px-1.5 font-mono text-[9px] font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-card text-foreground",
        success: "border-emerald-300 bg-emerald-50 text-emerald-800",
        warning: "border-amber-300 bg-amber-50 text-amber-900",
        danger: "border-red-300 bg-red-50 text-red-800",
        info: "border-sky-300 bg-sky-50 text-sky-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
