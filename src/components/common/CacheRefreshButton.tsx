
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CacheRefreshButtonProps {
  onClick: () => void;
  isRefreshing: boolean;
  isStale?: boolean;
  lastUpdated?: number | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const CacheRefreshButton: React.FC<CacheRefreshButtonProps> = ({
  onClick,
  isRefreshing,
  isStale = false,
  lastUpdated = null,
  className,
  size = 'icon',
  variant = 'ghost'
}) => {
  // Format the last updated time
  const formattedLastUpdated = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString() 
    : 'Never';
  
  // Determine the tooltip content
  const tooltipContent = isRefreshing 
    ? 'Refreshing data...' 
    : `Last updated: ${formattedLastUpdated}. ${isStale ? 'Data may be outdated.' : 'Data is up to date.'}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className={cn(
              className,
              isStale && !isRefreshing ? 'text-amber-500' : ''
            )}
            size={size}
            variant={variant}
            disabled={isRefreshing}
          >
            <RefreshCw 
              className={cn(
                "h-4 w-4",
                isRefreshing ? "animate-spin" : ""
              )} 
            />
            {size !== 'icon' && (
              <span className="ml-2">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CacheRefreshButton;
