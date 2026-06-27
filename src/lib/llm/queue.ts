interface QueueEntry {
  timestamp: number
}

interface ProviderQueue {
  entries: QueueEntry[]
  rpmLimit: number
}

const queues = new Map<string, ProviderQueue>()

export function trackRequest(provider: string, rpmLimit: number) {
  if (!queues.has(provider)) {
    queues.set(provider, { entries: [], rpmLimit })
  }
  const q = queues.get(provider)!
  q.entries.push({ timestamp: Date.now() })
}

export function getRequestCount(provider: string, windowMs = 60_000): number {
  const q = queues.get(provider)
  if (!q) return 0
  const cutoff = Date.now() - windowMs
  q.entries = q.entries.filter((e) => e.timestamp > cutoff)
  return q.entries.length
}

export function canMakeRequest(provider: string, rpmLimit: number): boolean {
  return getRequestCount(provider) < rpmLimit
}

export function getWaitTime(provider: string, rpmLimit: number): number {
  const q = queues.get(provider)
  if (!q || q.entries.length === 0) return 0
  const sorted = [...q.entries].sort((a, b) => a.timestamp - b.timestamp)
  if (sorted.length < rpmLimit) return 0
  const oldest = sorted[0]
  return Math.max(0, 60_000 - (Date.now() - oldest.timestamp))
}

export function getProviderStats(provider: string, rpmLimit: number) {
  const count = getRequestCount(provider)
  return {
    provider,
    requestsThisMinute: count,
    rpmLimit,
    remaining: Math.max(0, rpmLimit - count),
  }
}
