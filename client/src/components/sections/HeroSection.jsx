import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ChevronDown } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", {
        y: -20,
        opacity: 0,
        duration: 0.6,
        delay: 0.2,
        ease: "power3.out",
      });
      gsap.from(".hero-title-line", {
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.4,
      });
      gsap.from(".hero-desc", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.9,
        ease: "power3.out",
      });
      gsap.from(".hero-cta-btn", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 1.1,
        ease: "power3.out",
      });
      gsap.from(".hero-stat", {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 1.4,
        ease: "power3.out",
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
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-blood/10 via-transparent to-blood/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="hero-badge mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-4 py-1.5 text-sm font-medium text-blood backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-blood animate-pulse" />
              #1 Premium Fitness Hub
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] mb-6">
            <span className="hero-title-line block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-light">
              Transform
            </span>
            <span className="hero-title-line block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-light">
              Your <span className="text-blood">Body</span>
            </span>
            <span className="hero-title-line block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-blood">
              &amp; Life
            </span>
          </h1>

          {/* Description */}
          <p className="hero-desc text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed mb-8">
            State-of-the-art equipment, expert trainers, and a supportive
            community dedicated to your ultimate transformation.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <Link to="/register" className="hero-cta-btn">
              <Button size="xl" className="gap-2 w-full sm:w-auto text-base">
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
          <div className="grid grid-cols-3 gap-6 sm:gap-10 max-w-lg">
            {[
              { value: "10K+", label: "Active Members" },
              { value: "50+", label: "Expert Trainers" },
              { value: "24/7", label: "Open Access" },
            ].map((stat, i) => (
              <div key={i} className="hero-stat">
                <p className="text-3xl sm:text-4xl font-bold text-blood font-display">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-white/50 uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
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
