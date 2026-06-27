"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import EmptyState from "@/components/EmptyState"

interface Resume {
  id: string
  parsed_text?: string
  created_at: string
}

interface Job {
  id: string
  job_title: string
  company: string | null
}

export default function CoverLetterPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedResume, setSelectedResume] = useState("")
  const [selectedJob, setSelectedJob] = useState("")
  const [generating, setGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [copied, setCopied] = useState(false)
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [resumesRes, jobsRes] = await Promise.all([
        supabase
          .from("resumes")
          .select("id, parsed_text, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("target_jobs")
          .select("id, job_title, company")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ])

      if (resumesRes.data) {
        setResumes(resumesRes.data)
        if (resumesRes.data.length > 0) setSelectedResume(resumesRes.data[0].id)
      }
      if (jobsRes.data) {
        setJobs(jobsRes.data)
        if (jobsRes.data.length > 0) setSelectedJob(jobsRes.data[0].id)
      }
    }
    load()
  }, [supabase])

  const handleGenerate = async () => {
    if (!selectedResume || !selectedJob) return
    setGenerating(true)
    setCoverLetter("")
    try {
      const res = await fetch("/api/coverletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: selectedResume, job_id: selectedJob }),
      })
      const data = await res.json()
      if (data.cover_letter) {
        setCoverLetter(data.cover_letter)
      }
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (resumes.length === 0 || jobs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Cover Letter Generator</h1>
        <EmptyState
          title="Missing data"
          description={resumes.length === 0
            ? "Upload a resume first to generate cover letters."
            : "Add a target job first to generate cover letters."}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Cover Letter Generator</h1>

      <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Select Resume</label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  Resume — {new Date(r.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Target Job</label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_title}{j.company && ` @ ${j.company}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !selectedResume || !selectedJob}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate Cover Letter"}
        </button>
      </div>

      {coverLetter && (
        <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Your Cover Letter</h2>
            <button
              onClick={handleCopy}
              className="text-sm text-text-link hover:underline"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-ink whitespace-pre-wrap leading-relaxed">
            {coverLetter}
          </div>
        </div>
      )}
    </div>
  )
}
