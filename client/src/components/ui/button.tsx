import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ds-chrome text-white border-2 border-[color:var(--card-border)] rounded shadow-[2px_2px_0px_0px_var(--card-shadow)] hover:bg-ds-pop hover:text-ds-ink hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase font-black tracking-widest",
        "primary-cta": "bg-ds-success hover:bg-ds-pop hover:text-ds-ink text-white font-black uppercase tracking-widest rounded border-2 border-[color:var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded border-2 border-[color:var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-shadow)]",
        outline:
          "border-2 border-[color:var(--card-border)] bg-background hover:bg-ds-pop hover:text-ds-ink rounded shadow-[2px_2px_0px_0px_var(--card-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase font-black tracking-widest",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded border-2 border-[color:var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-shadow)]",
        ghost: "hover:bg-ds-pop hover:text-ds-ink rounded transition-colors uppercase font-black tracking-widest",
        link: "text-primary underline-offset-4 hover:underline uppercase tracking-widest font-black",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
