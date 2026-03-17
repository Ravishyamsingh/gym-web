import { Link } from "react-router-dom";

export default function PolicyLayout({ title, subtitle, updatedOn, children }) {
  return (
    <div className="min-h-screen bg-void text-light">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Back to Home
        </Link>

        <header className="mt-6 rounded-2xl border border-white/10 bg-surface/70 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-blood">Om Muruga Olympia Fitness</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/65 sm:text-base">{subtitle}</p>}
          {updatedOn && <p className="mt-4 text-xs text-white/45">Last updated: {updatedOn}</p>}
        </header>

        <main className="mt-6 rounded-2xl border border-white/10 bg-surface p-6 sm:p-8">
          <div className="space-y-5 text-sm leading-7 text-white/80 sm:text-base">{children}</div>
        </main>
      </div>
    </div>
  );
}
