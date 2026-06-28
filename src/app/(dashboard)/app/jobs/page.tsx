"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import EmptyState from "@/components/EmptyState"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  job_title: string
  company: string | null
  required_skills: Array<{ skill: string; priority: string; reason: string }>
  seniority_level: string | null
  created_at: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const supabase = useSupabase()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("target_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (data) setJobs(data)
    }
    load()
  }, [supabase])

  const handleAnalyze = async () => {
    if (!jobTitle.trim() || !description.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_title: jobTitle, company, job_description: description }),
      })
      const data = await res.json()
      if (data.job) {
        setJobs((prev) => [data.job, ...prev])
        setSelectedJob(data.job)
        setJobTitle("")
        setCompany("")
        setDescription("")
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleAnalyzeGap = async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: resume } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!resume) {
      alert("Please add a resume first")
      return
    }

    const res = await fetch("/api/gap/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resume.id, job_id: jobId }),
    })
    const data = await res.json()
    if (data.gap) {
      router.push("/app/gap")
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Target Jobs</h1>

      <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Add Job Description</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-canvas border border-hairline-strong rounded-md px-3 py-3 text-sm text-ink focus:outline-none focus:border-ink"
              placeholder="e.g., Senior React Developer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-canvas border border-hairline-strong rounded-md px-3 py-3 text-sm text-ink focus:outline-none focus:border-ink"
              placeholder="e.g., Stripe"
            />
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full h-48 bg-canvas border border-hairline-strong rounded-md p-4 text-sm text-ink resize-none focus:outline-none focus:border-ink mb-4"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !jobTitle.trim() || !description.trim()}
          className="bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          {loading ? "Analyzing..." : "Analyze Requirements"}
        </button>
      </div>

      {selectedJob && (
        <div className="bg-surface-card border border-hairline rounded-xl p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">
            {selectedJob.job_title}
            {selectedJob.company && <span className="text-body font-normal"> at {selectedJob.company}</span>}
          </h2>
          {selectedJob.seniority_level && (
            <span className="inline-block bg-surface-strong px-2 py-1 rounded text-xs font-medium text-ink mb-3">
              {selectedJob.seniority_level}
            </span>
          )}
          <div className="space-y-2">
            {selectedJob.required_skills.map((skill, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-canvas-soft rounded-md">
                <span className={`text-xs font-bold mt-0.5 ${
                  skill.priority === "high" ? "text-red-500" :
                  skill.priority === "medium" ? "text-yellow-500" :
                  "text-green-500"
                }`}>
                  {skill.priority === "high" ? "🔴" : skill.priority === "medium" ? "🟡" : "🟢"}
                </span>
                <div>
                  <div className="text-sm font-medium text-ink">{skill.skill}</div>
                  <div className="text-xs text-body">{skill.reason}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleAnalyzeGap(selectedJob.id)}
            className="mt-4 bg-primary text-on-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            Run Gap Analysis
          </button>
        </div>
      )}

      {!selectedJob && jobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          description="Paste a job description above to get started."
        />
      )}

      {!selectedJob && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-surface-card border border-hairline rounded-xl p-4 flex items-center justify-between hover:border-hairline-strong transition-colors"
            >
              <div>
                <div className="font-medium text-ink">{job.job_title}</div>
                <div className="text-sm text-body">
                  {job.company && `${job.company} · `}
                  {job.required_skills.length} skills · {job.seniority_level || "Any level"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="text-sm text-text-link hover:underline"
                >
                  View
                </button>
                <button
                  onClick={() => handleAnalyzeGap(job.id)}
                  className="bg-primary text-on-primary px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-active transition-colors"
                >
                  Gap Analysis
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
