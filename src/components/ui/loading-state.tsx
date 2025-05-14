
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  status: "loading" | "error" | "empty" | "retry";
  title?: string;
  description?: string;
  onRetry?: () => void;
  isInline?: boolean;
}

export function LoadingState({
  status,
  title,
  description,
  onRetry,
  isInline = false,
  className,
  ...props
}: LoadingStateProps) {
  const containerClasses = cn(
    "flex flex-col items-center justify-center text-center",
    isInline ? "py-4" : "min-h-[200px] py-8",
    className
  );

  const statusIcons = {
    loading: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
    error: <AlertCircle className="h-8 w-8 text-destructive" />,
    retry: <RefreshCw className="h-7 w-7 text-muted-foreground" />,
    empty: null,
  };

  return (
    <div className={containerClasses} {...props}>
      {statusIcons[status]}
      {title && (
        <h3 className={cn("mt-4 font-semibold", isInline ? "text-base" : "text-lg")}>
          {title}
        </h3>
      )}
      {description && (
        <p className={cn("mt-2 max-w-sm text-muted-foreground", isInline ? "text-sm" : "text-base")}>
          {description}
        </p>
      )}
      {status === "retry" && onRetry && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={(e) => {
            e.preventDefault();
            onRetry();
          }}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
