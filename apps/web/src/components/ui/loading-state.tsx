import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  rows?: number
  columns?: number
}

export function LoadingState({ rows = 5, columns = 4 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {/* ヘッダー行 */}
      <div className="flex gap-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* データ行 */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4">
          {Array.from({ length: columns }).map((_, ci) => (
            <Skeleton key={ci} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
