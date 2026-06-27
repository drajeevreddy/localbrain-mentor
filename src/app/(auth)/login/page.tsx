"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const supabase = useSupabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) { setError("Supabase not configured"); return }
    setLoading(true)
    setError("")

    const { error: authError } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
    } else if (mode === "signup") {
      setError("Check your email for a confirmation link.")
    } else {
      window.location.href = "/app"
    }

    setLoading(false)
  }

  const handleOAuth = async (provider: "google" | "github") => {
    if (!supabase) { setError("Supabase not configured"); return }
    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${redirectBase}/api/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-on-primary text-sm font-semibold">M</span>
            </div>
            <span className="text-ink font-semibold text-lg">LocalBrain Mentor</span>
          </Link>
          <h1 className="text-2xl font-semibold text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-body mt-1">
            {mode === "signin"
              ? "Sign in to continue your learning journey"
              : "Start closing your skill gap today"}
          </p>
        </div>

        <div className="bg-surface-card border border-hairline rounded-xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              className="flex-1 border border-hairline-strong rounded-md py-2 px-4 text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth("github")}
              className="flex-1 border border-hairline-strong rounded-md py-2 px-4 text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
            >
              GitHub
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface-card px-2 text-muted">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-semantic-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary rounded-md py-2 px-4 text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-sm text-body mt-4">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-text-link hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-text-link hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
