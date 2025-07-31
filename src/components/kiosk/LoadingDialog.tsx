import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingDialogProps {
  isOpen: boolean;
  t: (key: string) => string;
}

export const LoadingDialog: React.FC<LoadingDialogProps> = ({ isOpen, t }) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col">
        {/* Header skeleton */}
        <div className="pb-2">
          <Skeleton className="h-9 w-3/4 mb-2" />
          <Skeleton className="h-6 w-full" />
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
          {/* Options skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center">
                    <Skeleton className="w-5 h-5 rounded-full mr-3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Topping categories skeleton */}
          {[1, 2].map((categoryIndex) => (
            <div key={categoryIndex} className="space-y-2 p-4 rounded-xl bg-gray-50">
              <div className="flex items-center">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24 ml-2" />
              </div>
              
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between border p-2 rounded-lg bg-white">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer skeleton */}
        <div className="mt-3 pt-2">
          <div className="w-full flex items-center">
            <div className="flex items-center mr-4">
              <Skeleton className="h-12 w-12 rounded-full mr-2" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-12 w-12 rounded-full ml-2" />
            </div>
            <Skeleton className="flex-1 h-16 rounded" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};