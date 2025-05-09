
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

// Define the overlay but we won't use it by default
const DrawerOverlay = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>>(({
  className,
  ...props
}, ref) => <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />);
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  showOverlay?: boolean;
  preventClose?: boolean;
  passClicksToPage?: boolean;
  showCloseButton?: boolean;
}

const DrawerContent = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(({
  className,
  children,
  showOverlay = true,
  preventClose = false,
  passClicksToPage = false,
  showCloseButton = true,
  ...props
}, ref) => {
  // Create a custom handler that only prevents the drawer from closing
  // but doesn't block interaction with elements behind the drawer
  const handlePointerDownOutside = React.useCallback((e: Event) => {
    if (preventClose) {
      e.preventDefault();
    }
  }, [preventClose]);

  React.useEffect(() => {
    // If we want to pass clicks to the page, we need to modify how the drawer handles pointer events
    if (passClicksToPage) {
      // Find the drawer's backdrop element that typically blocks interaction
      const backdrop = document.querySelector('[data-vaul-drawer-wrapper]');
      if (backdrop) {
        // Store original pointer-events value to restore later
        const originalPointerEvents = backdrop.getAttribute('style') || '';
        
        // Set pointer-events to none to allow clicks to pass through
        backdrop.setAttribute('style', `${originalPointerEvents}; pointer-events: none !important;`);
        
        return () => {
          // Restore original style when component unmounts or dependencies change
          backdrop.setAttribute('style', originalPointerEvents);
        };
      }
    }
  }, [passClicksToPage]);

  return (
    <DrawerPortal>
      {showOverlay && <DrawerOverlay />}
      <DrawerPrimitive.Content 
        ref={ref} 
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-lg border bg-background", 
          className
        )} 
        onPointerDownOutside={handlePointerDownOutside}
        {...props}
      >
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-2" />
        {showCloseButton && (
          <DrawerPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-gray-100 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-600" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />;
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />;
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>>(({
  className,
  ...props
}, ref) => <DrawerPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />);
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>>(({
  className,
  ...props
}, ref) => <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };
