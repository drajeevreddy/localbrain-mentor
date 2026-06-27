export default function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div
            className="h-4 bg-surface-strong rounded"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        </div>
      ))}
    </div>
  )
}
