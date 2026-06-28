"use client"

interface MatchScoreRingProps {
  score: number
  size?: number
}

export default function MatchScoreRing({ score, size = 120 }: MatchScoreRingProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (s: number) => {
    if (s < 40) return "#eb8e90"
    if (s < 70) return "#ab6400"
    return "#16a34a"
  }

  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className=""
          style={{ stroke: 'var(--ring-bg, #f0f0f3)' }}
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-ring transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-ink">{score}%</span>
        <span className="text-xs text-muted">match</span>
      </div>
    </div>
  )
}
