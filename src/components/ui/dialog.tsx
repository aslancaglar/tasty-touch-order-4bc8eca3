import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    // Enhanced event handling for both mouse and touch events with proper type casting
    onClick={(e) => {
      e.stopPropagation();
      if (props.onClick) props.onClick(e);
    }}
    onTouchEnd={(e) => {
      e.stopPropagation();
      if (props.onTouchEnd) {
        props.onTouchEnd(e);
      } else if (props.onClick) {
        // We need a type assertion that respects the element type
        const event = {
          ...e,
          currentTarget: e.currentTarget,
          target: e.target,
        } as unknown as React.MouseEvent<HTMLDivElement>;
        props.onClick(event);
      }
    }}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Add a ref to prevent event propagation issues
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  // Combine refs
  const handleRefs = (node: HTMLDivElement) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
    contentRef.current = node;
  };

  // Prevent event propagation for both mouse and touch events
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    
    const handlePointerEvent = (e: Event) => {
      e.stopPropagation();
    };
    
    const handleTouchEvent = (e: TouchEvent) => {
      e.stopPropagation();
    };
    
    content.addEventListener('pointerdown', handlePointerEvent);
    content.addEventListener('pointermove', handlePointerEvent);
    content.addEventListener('pointerup', handlePointerEvent);
    
    // Add specific touch event handlers
    content.addEventListener('touchstart', handleTouchEvent);
    content.addEventListener('touchmove', handleTouchEvent);
    content.addEventListener('touchend', handleTouchEvent);
    
    return () => {
      content.removeEventListener('pointerdown', handlePointerEvent);
      content.removeEventListener('pointermove', handlePointerEvent);
      content.removeEventListener('pointerup', handlePointerEvent);
      content.removeEventListener('touchstart', handleTouchEvent);
      content.removeEventListener('touchmove', handleTouchEvent);
      content.removeEventListener('touchend', handleTouchEvent);
    };
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={handleRefs}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg rounded-lg will-change-transform",
          className
        )}
        // Enhanced event handling for both mouse and touch events
        onClick={(e) => {
          e.stopPropagation();
          if (props.onClick) props.onClick(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (props.onTouchEnd) {
            props.onTouchEnd(e);
          }
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (props.onPointerDown) props.onPointerDown(e);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (props.onPointerMove) props.onPointerMove(e);
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
