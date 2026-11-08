import { cva, type VariantProps } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] border text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-card text-foreground hover:bg-accent",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/75",
        ghost: "border-transparent text-foreground hover:bg-accent",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2 text-[11px]",
        icon: "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
