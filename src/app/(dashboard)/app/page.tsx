"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import MatchScoreRing from "@/components/MatchScoreRing"
import Link from "next/link"

interface DashboardData {
  latestGap: { match_score: number; gap_summary: string } | null
  latestRoadmap: { total_weeks: number; title: string } | null
  completedTasks: number
  totalTasks: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gaps } = await supabase
        .from("skill_gaps")
        .select("match_score, gap_summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      const { data: roadmaps } = await supabase
        .from("roadmaps")
        .select("id, total_weeks, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      let completedTasks = 0
      let totalTasks = 0

      if (roadmaps && roadmaps.length > 0) {
        const { data: weeks } = await supabase
          .from("roadmap_weeks")
          .select("tasks")
          .eq("roadmap_id", roadmaps[0].id)

        if (weeks) {
          for (const week of weeks) {
            const tasks = (week.tasks || []) as Array<{ completed: boolean }>
            totalTasks += tasks.length
            completedTasks += tasks.filter((t) => t.completed).length
          }
        }
      }

      setData({
        latestGap: gaps?.[0] || null,
        latestRoadmap: roadmaps?.[0] || null,
        completedTasks,
        totalTasks,
      })
      setLoading(false)
    }

    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="h-8 w-48 bg-surface-strong rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-surface-strong rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const hasData = data?.latestGap || data?.latestRoadmap

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Dashboard</h1>

      {!hasData ? (
        <div className="bg-surface-card border border-hairline rounded-xl p-6 lg:p-8 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold text-ink mb-2">Welcome to LocalBrain Mentor</h2>
          <p className="text-sm text-body mb-6">
            Start by pasting your resume and a target job description.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/app/resume"
              className="bg-primary text-on-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
            >
              Add Resume
            </Link>
            <Link
              href="/app/jobs"
              className="border border-hairline-strong text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-canvas-soft transition-colors"
            >
              Add Job
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 flex flex-col items-center">
            <MatchScoreRing score={data?.latestGap?.match_score || 0} />
            <p className="text-sm text-body mt-3">Current Match</p>
          </div>

          <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
              Roadmap Progress
            </h3>
            <div className="text-3xl font-semibold text-ink mb-1">
              {data?.totalTasks ? Math.round(((data?.completedTasks || 0) / data.totalTasks) * 100) : 0}%
            </div>
            <div className="w-full bg-hairline rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${data?.totalTasks ? ((data?.completedTasks || 0) / data.totalTasks) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted">
              {data?.completedTasks || 0} of {data?.totalTasks || 0} tasks completed
            </p>
          </div>

          <div className="bg-surface-card border border-hairline rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/app/roadmap"
                className="block text-sm text-text-link hover:underline"
              >
                View Roadmap →
              </Link>
              <Link
                href="/app/chat"
                className="block text-sm text-text-link hover:underline"
              >
                Ask Mentor →
              </Link>
              <Link
                href="/app/gap"
                className="block text-sm text-text-link hover:underline"
              >
                Re-analyze Gap →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
