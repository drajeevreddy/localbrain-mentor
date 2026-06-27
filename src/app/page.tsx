import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-on-primary text-sm font-semibold">M</span>
          </div>
          <span className="text-ink font-semibold text-lg">LocalBrain Mentor</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-body hover:text-ink transition-colors hidden sm:block">
            Sign In
          </Link>
          <Link
            href="/login"
            className="bg-primary text-on-primary px-3 sm:px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 lg:py-section overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight text-ink mb-4 sm:mb-6">
            Close the gap between where you are and where you want to be
          </h1>
          <p className="text-base sm:text-lg text-body max-w-xl mx-auto mb-6 sm:mb-8">
            Paste your resume. Paste a job description. Get a personalized learning roadmap
            with free resources — built by AI, tailored to you.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary text-on-primary px-6 py-3 rounded-md text-base font-medium hover:bg-primary-active transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <section className="px-4 lg:px-6 py-16 lg:py-section bg-canvas-soft">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-semibold text-center text-ink mb-8 lg:mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4 lg:gap-8">
            {[
              {
                step: "01",
                title: "Paste your resume",
                desc: "Drop in your resume text or upload a PDF. Our AI extracts your skills, experience, and projects.",
              },
              {
                step: "02",
                title: "Paste a job description",
                desc: "We analyze the target role and identify exactly which skills you need to develop.",
              },
              {
                step: "03",
                title: "Get your roadmap",
                desc: "Receive a week-by-week learning plan with free resources — YouTube, docs, and articles.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-surface-card border border-hairline rounded-lg p-4 lg:p-6">
                <div className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                  Step {item.step}
                </div>
                <h3 className="text-base lg:text-lg font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-body text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-6 py-16 lg:py-section">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-surface-card border border-hairline rounded-xl p-4 sm:p-8 mb-6 lg:mb-8">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-3xl sm:text-5xl font-semibold text-ink">67%</div>
              <div className="text-left">
                <div className="text-sm text-body">Current match score</div>
                <div className="text-xs text-muted">React Developer at Stripe</div>
              </div>
            </div>
            <div className="w-full bg-hairline rounded-full h-2 mb-4">
              <div className="bg-semantic-success h-2 rounded-full" style={{ width: "67%" }} />
            </div>
            <div className="text-sm text-body">
              <span className="text-semantic-success font-medium">Missing:</span>{" "}
              TypeScript (high), Testing (medium), GraphQL (low)
            </div>
          </div>
          <p className="text-sm text-muted">
            Sample gap analysis — your results will be personalized
          </p>
        </div>
      </section>

      <footer className="px-4 lg:px-6 py-6 lg:py-8 border-t border-hairline">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-muted">
            &copy; 2024 LocalBrain. All rights reserved.
          </div>
          <Link
            href="https://localbrain.in"
            target="_blank"
            className="text-sm text-text-link hover:underline"
          >
            LocalBrain Main App
          </Link>
        </div>
      </footer>
    </div>
  );
}
