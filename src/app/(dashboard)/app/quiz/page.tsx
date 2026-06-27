"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

interface Question {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

interface Skill {
  skill: string
  level: string
}

export default function QuizPage() {
  const supabase = useSupabase()
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkill, setSelectedSkill] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("intermediate")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("resumes")
        .select("parsed_skills")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      if (data?.parsed_skills) setSkills(data.parsed_skills)
    }
    load()
  }, [supabase])

  const generateQuiz = async () => {
    if (!selectedSkill) return
    setGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: selectedSkill, level: selectedLevel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz")
      setQuestions(data.questions)
      setCurrentQ(0)
      setAnswers([])
      setSelectedOption(null)
      setSubmitted(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz")
    }
    setGenerating(false)
  }

  const handleAnswer = () => {
    if (selectedOption === null) return
    const newAnswers = [...answers, selectedOption]
    setAnswers(newAnswers)
    setSelectedOption(null)

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setSubmitted(true)
    }
  }

  const score = answers.reduce((acc, a, i) => acc + (a === questions[i].correct_index ? 1 : 0), 0)

  const reset = () => {
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setSelectedOption(null)
    setSubmitted(false)
  }

  if (questions.length === 0 && !generating) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-ink">Skill Quiz</h1>
        <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 space-y-4">
          <p className="text-body text-sm">Test your knowledge with AI-generated quiz questions based on your resume skills.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Select Skill</label>
              {skills.length === 0 ? (
                <p className="text-sm text-muted">No skills found. Add a resume first.</p>
              ) : (
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full bg-canvas border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choose a skill...</option>
                  {skills.map((s) => (
                    <option key={s.skill} value={s.skill}>{s.skill} ({s.level})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Difficulty</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full bg-canvas border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-semantic-error">{error}</p>}
          <button
            onClick={generateQuiz}
            disabled={!selectedSkill || generating}
            className="px-4 py-2 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Start Quiz"}
          </button>
        </div>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-ink">Skill Quiz</h1>
        <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 text-body text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Generating quiz questions...
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-ink">Skill Quiz</h1>
        <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-3xl font-bold text-ink">{score}/{questions.length}</p>
            <p className="text-body text-sm">
              {score === questions.length ? "Perfect score!" : score >= questions.length * 0.8 ? "Great job!" : score >= questions.length * 0.5 ? "Good effort!" : "Keep studying!"}
            </p>
          </div>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const correct = answers[i] === q.correct_index
              return (
                <div key={i} className={`border rounded-lg p-3 ${correct ? "border-semantic-success/30 bg-semantic-success/5" : "border-semantic-error/30 bg-semantic-error/5"}`}>
                  <p className="text-sm font-medium text-ink mb-1">Q{i + 1}: {q.question}</p>
                  <p className="text-sm text-body mb-1">
                    Your answer: <span className={correct ? "text-semantic-success" : "text-semantic-error"}>{q.options[answers[i]]}</span>
                  </p>
                  {!correct && (
                    <p className="text-sm text-semantic-success mb-1">Correct: {q.options[q.correct_index]}</p>
                  )}
                  <p className="text-xs text-muted">{q.explanation}</p>
                </div>
              )
            })}
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            Try Another Quiz
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Skill Quiz</h1>
      <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-body">
          <span>Question {currentQ + 1} of {questions.length}</span>
          <span>{selectedSkill} · {selectedLevel}</span>
        </div>
        <div className="w-full bg-surface-strong rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-ink font-medium">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOption === i
                  ? "border-primary bg-primary/5"
                  : "border-hairline hover:border-hairline-strong"
              }`}
            >
              <input
                type="radio"
                name="quiz-option"
                checked={selectedOption === i}
                onChange={() => setSelectedOption(i)}
                className="w-4 h-4 text-primary accent-primary"
              />
              <span className="text-sm text-ink">{opt}</span>
            </label>
          ))}
        </div>
        <button
          onClick={handleAnswer}
          disabled={selectedOption === null}
          className="px-4 py-2 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors disabled:opacity-50"
        >
          {currentQ < questions.length - 1 ? "Next" : "Submit"}
        </button>
      </div>
    </div>
  )
}
