
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Simple implementation of a toggle group to replace the Radix UI version
export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  type?: "single" | "multiple"
  disabled?: boolean
  variant?: "default" | "outline"
}

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, value, onValueChange, type = "single", disabled = false, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-1", className)}
        {...props}
      />
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  disabled?: boolean
  variant?: "default" | "outline"
}

export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, disabled = false, variant = "default", onClick, ...props }, ref) => {
    const parentToggleGroup = React.useContext({
      value: "",
      onValueChange: (_: string) => {},
      type: "single",
      disabled: false,
      variant: "default",
    } as React.Context<ToggleGroupProps>)

    const isSelected = parentToggleGroup.value === value
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (parentToggleGroup.onValueChange) {
        parentToggleGroup.onValueChange(value)
      }
      onClick?.(e)
    }

    return (
      <Button
        ref={ref}
        type="button"
        variant={isSelected ? "default" : "outline"}
        className={cn(className)}
        disabled={disabled || parentToggleGroup.disabled}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"
