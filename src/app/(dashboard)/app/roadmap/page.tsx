"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import EmptyState from "@/components/EmptyState"

interface RoadmapWeek {
  id: string
  week_number: number
  theme: string
  tasks: Array<{
    task: string
    resource_url: string
    resource_type: string
    estimated_hours: number
    completed: boolean
  }>
  completed: boolean
}

interface Roadmap {
  id: string
  title: string
  total_weeks: number
  created_at: string
}

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [weeks, setWeeks] = useState<RoadmapWeek[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: roadmaps } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (roadmaps && roadmaps.length > 0) {
        setRoadmap(roadmaps[0])
        const { data: weekData } = await supabase
          .from("roadmap_weeks")
          .select("*")
          .eq("roadmap_id", roadmaps[0].id)
          .order("week_number")
        if (weekData) setWeeks(weekData)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const toggleTask = async (weekId: string, taskIndex: number, completed: boolean) => {
    if (!roadmap) return

    const week = weeks.find((w) => w.id === weekId)
    if (!week) return

    const updatedWeeks = weeks.map((w) => {
      if (w.id !== weekId) return w
      const tasks = [...w.tasks]
      tasks[taskIndex] = { ...tasks[taskIndex], completed }
      return { ...w, tasks }
    })
    setWeeks(updatedWeeks)

    await fetch(`/api/roadmap/${roadmap.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_number: week.week_number, task_index: taskIndex, completed }),
    })
  }

  const completedTasks = weeks.reduce(
    (acc, w) => acc + w.tasks.filter((t) => t.completed).length,
    0
  )
  const totalTasks = weeks.reduce((acc, w) => acc + w.tasks.length, 0)
  const currentWeek = weeks.find((w) => !w.completed)?.week_number || weeks.length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-surface-strong rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-surface-strong rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">My Roadmap</h1>
        <EmptyState
          title="No roadmap yet"
          description="Complete a gap analysis first, then generate your personalized learning roadmap."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{roadmap.title}</h1>
          <p className="text-sm text-body mt-1">
            Week {currentWeek} of {roadmap.total_weeks} · {completedTasks}/{totalTasks} tasks
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-ink">
            {totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%
          </div>
          <div className="w-32 bg-hairline rounded-full h-2 mt-1">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {weeks.map((week) => {
          const weekCompleted = week.tasks.every((t) => t.completed)
          const isCurrent = !weekCompleted && week.week_number === currentWeek

          return (
            <div
              key={week.id}
              className={`bg-surface-card border rounded-xl overflow-hidden transition-all ${
                isCurrent ? "border-primary ring-1 ring-primary/20" :
                weekCompleted ? "border-semantic-success/30" :
                "border-hairline"
              }`}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    weekCompleted ? "bg-semantic-success text-white" :
                    isCurrent ? "bg-primary text-white" :
                    "bg-surface-strong text-muted"
                  }`}>
                    {weekCompleted ? "✓" : week.week_number}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">{week.theme}</div>
                    <div className="text-xs text-muted">
                      {week.tasks.filter((t) => t.completed).length}/{week.tasks.length} tasks ·{" "}
                      {week.tasks.reduce((a, t) => a + t.estimated_hours, 0)}h estimated
                    </div>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Current Week
                  </span>
                )}
              </div>

              {isCurrent && (
                <div className="px-4 pb-4 space-y-2">
                  {week.tasks.map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
                        task.completed ? "bg-green-50" : "bg-canvas-soft"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => toggleTask(week.id, taskIndex, e.target.checked)}
                        className="mt-0.5 rounded border-hairline-strong"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${task.completed ? "line-through text-muted" : "text-ink"}`}>
                          {task.task}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={task.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-text-link hover:underline"
                          >
                            {task.resource_type === "youtube" ? "▶ YouTube" :
                             task.resource_type === "docs" ? "📚 Docs" :
                             task.resource_type === "github" ? "🐙 GitHub" :
                             "📄 Article"}
                          </a>
                          <span className="text-xs text-muted">· {task.estimated_hours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
