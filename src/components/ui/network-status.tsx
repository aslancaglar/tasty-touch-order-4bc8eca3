
import { useConnectionStatus } from "@/hooks/use-network-aware-fetch";
import { Wifi, WifiOff, Database } from "lucide-react";
import { Badge } from "./badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

interface NetworkStatusProps {
  isFromCache?: boolean;
  lastUpdated?: Date | null;
  className?: string;
  showLabel?: boolean;
}

export function NetworkStatus({ 
  isFromCache, 
  lastUpdated, 
  className,
  showLabel = false
}: NetworkStatusProps) {
  const connectionStatus = useConnectionStatus();
  
  const getStatusIcon = () => {
    if (connectionStatus === 'offline') {
      return <WifiOff className="h-4 w-4" />;
    }
    
    if (isFromCache) {
      return <Database className="h-4 w-4" />;
    }
    
    return <Wifi className="h-4 w-4" />;
  };
  
  const getTooltipText = () => {
    if (connectionStatus === 'offline') {
      return "You are offline. Showing cached data.";
    }
    
    if (isFromCache) {
      return lastUpdated 
        ? `Showing cached data from ${lastUpdated.toLocaleString()}`
        : "Showing cached data";
    }
    
    return "Connected to network";
  };
  
  const getStatusColor = () => {
    if (connectionStatus === 'offline') return "bg-destructive";
    if (isFromCache) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  const getStatusText = () => {
    if (connectionStatus === 'offline') return "Offline";
    if (isFromCache) return "Cached";
    return "Online";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1 border-none",
              getStatusColor(),
              "text-white",
              className
            )}
          >
            {getStatusIcon()}
            {showLabel && <span>{getStatusText()}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
