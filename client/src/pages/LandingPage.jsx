import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
import { ScanFace, Shield, BarChart3, Zap } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: ScanFace,
    title: "Face Verification",
    desc: "Walk in, open your phone, verify your face. No cards, no QR codes — just you.",
  },
  {
    icon: Shield,
    title: "Bulletproof Security",
    desc: "Firebase Auth + TensorFlow.js facial recognition running entirely on-device. Zero data leaks.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Admin Dashboard",
    desc: "See who's in the gym right now, manage payments, and export reports — all in one place.",
  },
  {
    icon: Zap,
    title: "Instant. Always.",
    desc: "No loading spinners, no waiting. The entire verification pipeline runs locally in under a second.",
  },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.from(".hero-title", { y: 80, opacity: 0, duration: 1, ease: "power3.out" });
      gsap.from(".hero-subtitle", { y: 40, opacity: 0, duration: 1, delay: 0.3, ease: "power3.out" });
      gsap.from(".hero-cta", { y: 30, opacity: 0, duration: 0.8, delay: 0.6, ease: "power3.out" });

      // Features 50/50 alternating scroll
      gsap.utils.toArray(".feature-row").forEach((row, i) => {
        const direction = i % 2 === 0 ? -100 : 100;
        gsap.from(row.querySelector(".feature-text"), {
          x: -direction,
          opacity: 0,
          duration: 0.8,
          scrollTrigger: { trigger: row, start: "top 80%", toggleActions: "play none none reverse" },
        });
        gsap.from(row.querySelector(".feature-icon-box"), {
          x: direction,
          opacity: 0,
          duration: 0.8,
          scrollTrigger: { trigger: row, start: "top 80%", toggleActions: "play none none reverse" },
        });
      });

      // CTA section
      gsap.from(".cta-section", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: { trigger: ".cta-section", start: "top 85%" },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-void text-light overflow-x-hidden">
      {/* ── Navbar ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-void/80 backdrop-blur-md border-b border-white/5">
        <span className="font-display text-2xl font-bold tracking-wider">
          GYM<span className="text-blood">WEB</span>
        </span>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Join Now</Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero (100vh) ───────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Subtle gradient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(210,10,10,0.08)_0%,_transparent_70%)]" />

        <h1 className="hero-title font-display text-5xl sm:text-7xl md:text-8xl font-bold uppercase leading-[0.95] tracking-tight">
          Train <span className="text-blood">Harder.</span>
          <br />
          Enter <span className="text-blood">Smarter.</span>
        </h1>
        <p className="hero-subtitle mt-6 max-w-xl text-base sm:text-lg text-white/60">
          The premium gym platform powered by facial recognition. No cards. No excuses.
          Your face is your membership.
        </p>
        <div className="hero-cta mt-10 flex gap-4">
          <Link to="/register">
            <Button size="xl">Get Started</Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="xl">Learn More</Button>
          </a>
        </div>
      </section>

      {/* ── Features (50/50 alternating) ──── */}
      <section ref={featuresRef} id="features" className="mx-auto max-w-6xl px-6 py-24 space-y-24">
        {features.map((f, i) => (
          <div
            key={f.title}
            className={`feature-row flex flex-col md:flex-row items-center gap-12 ${
              i % 2 !== 0 ? "md:flex-row-reverse" : ""
            }`}
          >
            {/* Icon box */}
            <div className="feature-icon-box flex h-40 w-40 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-surface">
              <f.icon size={56} className="text-blood" />
            </div>

            {/* Text */}
            <div className="feature-text flex-1 text-center md:text-left">
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase">{f.title}</h2>
              <p className="mt-4 text-base text-white/60 max-w-md">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section ref={ctaRef} className="cta-section mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase">
          Ready to <span className="text-blood">transform</span> your gym?
        </h2>
        <p className="mt-4 text-white/50">
          Join now and experience entry verification that feels like the future.
        </p>
        <Link to="/register" className="mt-8 inline-block">
          <Button size="xl">Join GymWeb</Button>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/30">
        &copy; {new Date().getFullYear()} GymWeb. Built with grit.
      </footer>
    </div>
  );
}
