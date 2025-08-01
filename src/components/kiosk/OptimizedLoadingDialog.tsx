import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedLoadingDialogProps {
  isOpen: boolean;
  t: (key: string) => string;
  showSkeleton?: boolean;
}

export const OptimizedLoadingDialog: React.FC<OptimizedLoadingDialogProps> = ({
  isOpen,
  t,
  showSkeleton = true
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bold text-3xl mx-0 my-0 leading-relaxed">
            <Skeleton className="h-9 w-64" />
          </DialogTitle>
          <div className="pt-2">
            <Skeleton className="h-6 w-96" />
          </div>
        </DialogHeader>
        
        {showSkeleton ? (
          <div className="space-y-4 overflow-y-auto pr-2 flex-grow select-none">
            {/* Options skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center">
                      <Skeleton className="w-5 h-5 mr-3 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>

            {/* Toppings skeleton */}
            {[1, 2].map(categoryIndex => (
              <div key={categoryIndex} className="space-y-2 p-4 rounded-xl mb-4 bg-gray-50">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-24 ml-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6].map(toppingIndex => (
                    <div key={toppingIndex} className="flex items-center justify-between border p-2 rounded-lg bg-white">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-violet-700 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">{t("loading")}</p>
            </div>
          </div>
        )}
        
        {/* Footer skeleton */}
        <div className="mt-3 pt-2">
          <div className="w-full flex items-center">
            <div className="flex items-center mr-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-8 mx-2" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="flex-1 h-16 rounded-md" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};