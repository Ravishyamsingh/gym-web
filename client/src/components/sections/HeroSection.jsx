import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ChevronDown } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

function AnimatedStat({ target, suffix = "", label, duration = 1300 }) {
  const [value, setValue] = useState(0);
  const statRef = useRef(null);

  useEffect(() => {
    const node = statRef.current;
    if (!node) return;

    let started = false;
    let rafId;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || started) return;

        started = true;
        const start = performance.now();

        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.floor(eased * target));

          if (progress < 1) {
            rafId = requestAnimationFrame(tick);
          }
        };

        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [duration, target]);

  return (
    <div ref={statRef} className="hero-stat">
      <p className="text-3xl sm:text-4xl font-bold text-blood font-display">
        {value}
        {suffix}
      </p>
      <p className="text-xs sm:text-sm text-white/50 uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}

export default function HeroSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", {
        y: -16,
        opacity: 0,
        duration: 0.55,
        delay: 0.2,
        ease: "power3.out",
      });
      gsap.fromTo(
        ".hero-title-primary",
        { clipPath: "inset(0 100% 0 0)", opacity: 0.4 },
        {
          clipPath: "inset(0 0% 0 0)",
          opacity: 1,
          duration: 0.95,
          ease: "power3.out",
          delay: 0.35,
        }
      );
      gsap.from(".hero-title-cursor", {
        opacity: 0,
        duration: 0.2,
        repeat: 4,
        yoyo: true,
        delay: 1.1,
      });
      gsap.from(".hero-title-accent", {
        y: 26,
        opacity: 0,
        duration: 0.85,
        delay: 0.88,
        ease: "power3.out",
      });
      gsap.from(".hero-desc", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        delay: 1.08,
        ease: "power3.out",
      });
      gsap.from(".hero-cta-btn", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 1.25,
        ease: "power3.out",
      });
      gsap.from(".hero-stat", {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 1.45,
        ease: "power3.out",
      });

      gsap.to(".hero-bg-image", {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&auto=format&fit=crop"
          alt="Gym interior"
          className="hero-bg-image h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-blood/6 via-transparent to-blood/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.35)_52%,rgba(0,0,0,0.58)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-badge mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-4 py-1.5 text-sm font-medium text-blood backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-blood animate-pulse" />
              #1 Premium Fitness Hub
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-black uppercase tracking-tight leading-[0.92] mb-6 select-none">
            <span className="hero-title-primary hero-title-shadow block text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-transparent [text-shadow:0_4px_14px_rgba(0,0,0,0.5)] [-webkit-text-stroke:1.8px_#ffffff]">
              Transform Your
              <span className="hero-title-cursor ml-1 text-light"></span>
            </span>
            <span className="hero-title-accent hero-title-shadow block text-4xl sm:text-5xl md:text-6xl lg:text-6xl bg-gradient-to-r from-white via-white to-blood bg-clip-text text-transparent">
            physique and Lifestyle
            </span>
          </h1>

          {/* Description */}
          <p className="hero-desc hero-copy-shadow text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mb-8">
            State-of-the-art equipment, expert trainers, and a supportive
            community dedicated to your ultimate transformation.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-14 justify-center">
            <Link to="/register" className="hero-cta-btn">
              <Button size="xl" className="cta-pulse gap-2 w-full sm:w-auto text-base">
                Start Your Journey <ArrowRight size={20} />
              </Button>
            </Link>
            <a href="#about" className="hero-cta-btn">
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto text-base backdrop-blur-sm"
              >
                Explore More
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 max-w-2xl mx-auto">
            <AnimatedStat target={100} suffix="+" label="Active Members" duration={1400} />
            <AnimatedStat target={1} suffix="+" label="Expert Trainers" duration={1200} />
            <AnimatedStat target={24} suffix="/7" label="Login Access" duration={1000} />
          </div>
        </div>
      </div>

      {/* Bottom edge fade for smooth section transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent z-10 pointer-events-none" />

      {/* Scroll Indicator */}
      <motion.a
        href="#about"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 cursor-pointer"
      >
        <p className="text-white/40 text-xs uppercase tracking-widest">
          Scroll
        </p>
        <ChevronDown size={20} className="text-white/40" />
      </motion.a>
    </section>
  );
}
