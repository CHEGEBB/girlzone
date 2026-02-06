import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col md:flex-row h-full bg-background">
      <div className="flex-1 flex flex-col h-screen md:h-full min-w-0">
        {/* Header Skeleton */}
        <div className="h-12 md:h-16 border-b border-border flex items-center px-3 md:px-4 justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 hidden md:block" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        
        {/* Messages Skeleton */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
           <div className="flex justify-start"><Skeleton className="h-16 w-[70%] rounded-2xl rounded-tl-none" /></div>
           <div className="flex justify-end"><Skeleton className="h-12 w-[60%] rounded-2xl rounded-tr-none" /></div>
           <div className="flex justify-start"><Skeleton className="h-24 w-[70%] rounded-2xl rounded-tl-none" /></div>
           <div className="flex justify-end"><Skeleton className="h-12 w-[40%] rounded-2xl rounded-tr-none" /></div>
        </div>

        {/* Input Skeleton */}
        <div className="p-4 border-t border-border">
           <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>

      {/* Right Sidebar Skeleton - Profile */}
      <div className="hidden lg:block lg:w-80 border-l border-border overflow-y-auto">
         <div className="p-4 border-b border-border flex justify-between items-center">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24 rounded-md" />
         </div>
         <div className="p-4">
            <Skeleton className="aspect-square w-full rounded-xl mb-4" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            
            <div className="flex gap-4 border-b border-border mb-4 pb-2">
               <Skeleton className="h-6 w-16" />
               <Skeleton className="h-6 w-16" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
               <Skeleton className="aspect-square rounded-lg" />
               <Skeleton className="aspect-square rounded-lg" />
               <Skeleton className="aspect-square rounded-lg" />
               <Skeleton className="aspect-square rounded-lg" />
            </div>
         </div>
      </div>
    </div>
  )
}
