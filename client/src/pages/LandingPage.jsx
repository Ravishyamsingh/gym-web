import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import HeroSection from "@/components/sections/HeroSection";
import {
  Dumbbell,
  Heart,
  Users,
  Zap,
  Award,
  Clock,
  Leaf,
  Shield,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";


/* ─── Data ────────────────────────────────────────────────────────── */

const facilities = [
  {
    icon: Dumbbell,
    title: "Modern Equipment",
    desc: "State-of-the-art weights, machines, and training equipment for all fitness levels.",
    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Zap,
    title: "Cardio Zone",
    desc: "Advanced treadmills, ellipticals, and rowing machines for optimal cardio training.",
    img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Award,
    title: "Weight Training",
    desc: "Comprehensive free weights and strength area with expert guidance.",
    img: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Users,
    title: "Personal Training",
    desc: "One-on-one sessions with certified trainers tailored to your goals.",
    img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Shield,
    title: "Locker Rooms",
    desc: "Secure, clean, and well-maintained facilities with premium amenities.",
    img: "https://images.unsplash.com/photo-1766755418440-f3a342d54a58?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Leaf,
    title: "Air Conditioned",
    desc: "Comfortable climate-controlled environment for optimal training.",
    img: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&q=80&auto=format&fit=crop",
  },
];

const benefits = [
  { icon: Award, title: "Certified Trainers", desc: "Expert guidance from professionally certified fitness trainers." },
  { icon: Heart, title: "Personalized Plans", desc: "Custom workout and diet guidance tailored to your body and goals." },
  { icon: Clock, title: "Flexible Timing", desc: "Open early morning to late night — train on your schedule." },
  { icon: Shield, title: "Hygiene First", desc: "Spotless facilities with regular sanitization and maintenance." },
  { icon: Leaf, title: "Nutrition Support", desc: "Professional diet guidance to complement your training." },
  { icon: Users, title: "Community", desc: "Join a supportive community of fitness enthusiasts." },
];

const MONTHLY_FEE = 600;
const formatInr = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const plans = [
  { duration: "1 Month", months: 1, per: "/month", features: ["Unlimited Gym Access", "All Equipment", "Basic Support"] },
  {
    duration: "6 Months",
    months: 6,
    per: "/6 months",
    specialOfferPrice: 3000,
    isSpecialOffer: true,
    popular: true,
    features: ["Unlimited Gym Access", "All Equipment", "Priority Support", "Monthly Fitness Report"],
  },
  {
    duration: "12 Months",
    months: 12,
    per: "/12 months",
    specialOfferPrice: 5400,
    isSpecialOffer: true,
    features: ["Unlimited Gym Access", "All Equipment", "Priority Support", "Monthly Fitness Report", "Free Personal Training", "Nutrition Consultation"],
  },
];

const galleryImages = [
  { src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format&fit=crop", alt: "Gym Floor", span: "col-span-2 row-span-2" },
  { src: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&auto=format&fit=crop", alt: "Weight Training" },
  { src: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80&auto=format&fit=crop", alt: "Workout Session" },
  { src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&auto=format&fit=crop", alt: "Personal Training" },
  { src: "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&q=80&auto=format&fit=crop", alt: "Dumbbell Rack" },
  { src: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80&auto=format&fit=crop", alt: "Strength Training", span: "col-span-2" },
  { src: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80&auto=format&fit=crop", alt: "Cardio Zone" },
  { src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80&auto=format&fit=crop", alt: "Group Training" },
];

const programs = [
  {
    title: "Strength Builder",
    duration: "12 Weeks",
    desc: "Progressive overload focused program for pure strength gains and better lifting form.",
    icon: Dumbbell,
  },
  {
    title: "Fat Loss Express",
    duration: "8 Weeks",
    desc: "HIIT + cardio + nutrition support to reduce fat percentage without losing muscle quality.",
    icon: Zap,
  },
  {
    title: "Body Recomposition",
    duration: "16 Weeks",
    desc: "Balanced program to build lean muscle while reducing fat with trainer-led tracking.",
    icon: Heart,
  },
];

/* ─── Framer Motion helpers ───────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

const zoomReveal = {
  hidden: (i = 0) => ({
    opacity: 0,
    scale: 0.78,
    rotate: i % 2 === 0 ? -2 : 2,
    x: i % 2 === 0 ? -24 : 24,
  }),
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    x: 0,
    transition: { duration: 0.72, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const flipIn = {
  hidden: { opacity: 0, rotateY: -18, y: 42 },
  visible: (i = 0) => ({
    opacity: 1,
    rotateY: 0,
    y: 0,
    transition: { duration: 0.78, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const slideInRight = {
  hidden: { opacity: 0, x: 90 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.05,
    },
  },
};

const splitImage = {
  hidden: { opacity: 0, x: -90, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
  },
};

const splitText = {
  hidden: { opacity: 0, x: 90 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.12 },
  },
};

function SectionHeading({ sub, children }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={fadeUp}
      className="text-center mb-14"
    >
      {sub && (
        <p className="text-blood uppercase tracking-widest text-sm font-semibold mb-3">
          {sub}
        </p>
      )}
      <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase mb-4">
        {children}
      </h2>
      <div className="relative h-1 w-28 bg-white/10 mx-auto overflow-hidden rounded-full">
        <motion.span
          className="absolute inset-y-0 left-0 w-16 bg-blood rounded-full"
          initial={{ x: -70 }}
          whileInView={{ x: 120 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.15 }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const revealViewport = shouldReduceMotion
    ? { once: true, amount: 0.5 }
    : { once: false, margin: "-120px 0px -120px 0px", amount: 0.2 };
  const endRevealViewport = shouldReduceMotion
    ? { once: true, amount: 0.5 }
    : { once: true, amount: 0.28, margin: "-70px 0px -70px 0px" };

  return (
    <div className="bg-void text-light overflow-x-hidden">
      {/* ── Navbar ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-void/80 backdrop-blur-lg border-b border-white/5">
        <Link to="/" className="font-display text-2xl font-bold tracking-wider uppercase">
          Om Muruga <span className="text-blood">Olympia Fitness</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <a href="#about" className="nav-link">About</a>
          <a href="#facilities" className="nav-link">Facilities</a>
          <a href="#gallery" className="nav-link">Gallery</a>
          <a href="#plans" className="nav-link">Plans</a>
          <a href="#programs" className="nav-link">Programs</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log In</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Join Now</Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <HeroSection />

      {/* ══════════════════════════════════════
           ABOUT SECTION
         ══════════════════════════════════════ */}
      <section id="about" className="relative py-28 px-6">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-void via-surface/40 to-void pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="Who We Are">
            About <span className="text-blood">Our Gym</span>
          </SectionHeading>

          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Image Side */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={splitImage}
              className="relative"
            >
              {/* Main image */}
              <motion.div
                className="relative rounded-2xl overflow-hidden group shadow-2xl shadow-black/50"
                initial={{ scale: 1.05 }}
                whileInView={{ scale: 1 }}
                viewport={revealViewport}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <motion.img
                  src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&auto=format&fit=crop"
                  alt="Gym interior"
                  className="w-full h-[440px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  initial={{ scale: 1.15 }}
                  whileInView={{ scale: 1 }}
                  viewport={revealViewport}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </motion.div>
              {/* Small secondary image offset */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={revealViewport}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="hidden lg:block absolute -bottom-8 -right-8 w-48 h-48 rounded-xl overflow-hidden border-4 border-void shadow-xl"
              >
                <img
                  src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80&auto=format&fit=crop"
                  alt="Cardio area"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </motion.div>
              {/* Floating stat card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={revealViewport}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -bottom-6 left-6 bg-blood rounded-xl p-5 shadow-2xl shadow-blood/30"
              >
                <p className="text-3xl font-bold font-display">10+</p>
                <p className="text-sm text-white/80">Years of Excellence</p>
              </motion.div>
            </motion.div>

            {/* Text Side */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={splitText}
              className="space-y-6"
            >
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-blood mb-3">Our Mission</h3>
                <p className="text-white/70 leading-relaxed">
                  To empower individuals to achieve their fitness goals through expert guidance,
                  modern facilities, and a welcoming community environment that inspires greatness.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-blood mb-3">Our Vision</h3>
                <p className="text-white/70 leading-relaxed">
                  To be the most trusted fitness destination, known for transforming lives
                  and building a healthier, stronger community — one member at a time.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-blood mb-3">Why Choose Us</h3>
                <p className="text-white/70 leading-relaxed">
                  With over a decade of excellence we combine cutting-edge equipment,
                  certified trainers, and personalized programs to ensure real, lasting results.
                </p>
              </motion.div>

              {/* Quick stats row */}
              <motion.div variants={staggerContainer} className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { val: "100+", label: "Members" },
                  { val: "1+", label: "Trainers" },
                  { val: "24/7", label: "Access" },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    variants={fadeUp}
                    whileHover={{ y: -4, scale: 1.03 }}
                    className="text-center rounded-xl bg-white/5 border border-white/10 py-3"
                  >
                    <p className="text-xl font-bold text-blood font-display">{s.val}</p>
                    <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp}>
                <Link to="/register">
                  <Button size="lg" className="gap-2 mt-4 liquid-btn">
                    Join Us Today <ArrowRight size={18} />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           FACILITIES SECTION
         ══════════════════════════════════════ */}
      <section id="facilities" className="relative py-28 px-6">
        {/* Background gradient to prevent flat/empty look */}
        <div className="absolute inset-0 bg-gradient-to-b from-void via-surface/20 to-void pointer-events-none" />
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blood/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="What We Offer">
            Our <span className="text-blood">Facilities</span>
          </SectionHeading>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {facilities.map((f, i) => (
              <motion.div
                key={f.title}
                variants={flipIn}
                custom={i}
                whileHover={{ y: -12, scale: 1.02, transition: { duration: 0.3 } }}
                className="group flex flex-col rounded-2xl border border-white/10 bg-surface/60 overflow-hidden hover:border-blood/60 hover:shadow-2xl hover:shadow-blood/25 transition-all duration-300"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Image */}
                <motion.div className="relative h-48 overflow-hidden" variants={zoomReveal} custom={i}>
                  <motion.img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    whileHover={{ scale: 1.12 }}
                    transition={{ duration: 0.35 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                  <motion.div
                    whileHover={{ rotate: -8, scale: 1.08 }}
                    className="absolute bottom-3 left-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blood shadow-lg shadow-blood/40"
                  >
                    <f.icon size={24} className="text-white" />
                  </motion.div>
                </motion.div>
                {/* Text */}
                <motion.div variants={fadeUp} className="flex-1 p-5">
                  <h3 className="text-lg font-bold text-light mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           FEATURES / WHY CHOOSE US
         ══════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        {/* Background image with dark overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=60&auto=format&fit=crop"
            alt="Background"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="Our Advantage">
            Why Choose <span className="text-blood">Us</span>
          </SectionHeading>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={scaleIn}
                custom={i}
                whileHover={{ scale: 1.045, y: -6, transition: { duration: 0.25 } }}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 hover:border-blood/50 hover:bg-blood/5 hover:shadow-xl hover:shadow-blood/10 transition-all duration-300"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blood/20 group-hover:bg-blood/30 transition-colors">
                  <b.icon size={28} className="text-blood" />
                </div>
                <h3 className="text-lg font-bold text-light mb-2">{b.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed flex-1">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           GALLERY SECTION
         ══════════════════════════════════════ */}
      <section id="gallery" className="relative py-28 px-6">
        {/* Background depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-void via-surface/30 to-void pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="Our Space">
            Photo <span className="text-blood">Gallery</span>
          </SectionHeading>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px] md:auto-rows-[210px]">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={zoomReveal}
                custom={i}
                className={`relative rounded-xl overflow-hidden group cursor-pointer border border-white/5 hover:border-blood/30 transition-all duration-300 hover:shadow-lg hover:shadow-blood/10 ${img.span || ""}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-4">
                  <p className="text-white font-semibold text-sm translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                    {img.alt}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           MEMBERSHIP PLANS
         ══════════════════════════════════════ */}
      <section id="plans" className="relative py-28 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1600&q=60&auto=format&fit=crop"
            alt="Background"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/92" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <SectionHeading sub="Pricing">
            Membership <span className="text-blood">Plans</span>
          </SectionHeading>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 items-stretch"
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.duration}
                variants={fadeUp}
                whileHover={{ y: -12, scale: 1.02, transition: { duration: 0.3 } }}
                className={`flex flex-col rounded-2xl border-2 p-8 backdrop-blur-md transition-all duration-300 ${
                  plan.popular
                    ? "border-blood bg-gradient-to-br from-blood/25 to-surface/90 md:scale-105 shadow-2xl shadow-blood/20"
                    : "border-white/10 bg-surface/80 hover:border-blood/40 hover:shadow-2xl hover:shadow-blood/20"
                }`}
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {plan.popular && (
                    <div className="inline-block bg-blood text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  {plan.isSpecialOffer && (
                    <motion.div
                      className="relative inline-flex items-center rounded-md bg-gradient-to-r from-blood to-red-500 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blood/40 ring-1 ring-white/20"
                      initial={{ scale: 0.92, rotate: -7 }}
                      whileInView={{ scale: 1, rotate: -5 }}
                      animate={{ y: [0, -2, 0], rotate: [-5, -4, -5] }}
                      transition={{
                        whileInView: { duration: 0.35, ease: "easeOut" },
                        y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      }}
                    >
                      <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-black/35" />
                      <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-black/35" />
                      Special Offer
                    </motion.div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.duration}</h3>
                <div className="mb-6">
                  {plan.isSpecialOffer && (
                    <p className="text-xs sm:text-sm text-white/45 line-through mb-1">
                      {formatInr(plan.months * MONTHLY_FEE)}
                    </p>
                  )}
                  <span className="text-4xl font-bold text-blood">
                    {formatInr(plan.isSpecialOffer ? plan.specialOfferPrice : plan.months * MONTHLY_FEE)}
                  </span>
                  <span className="text-white/60 text-sm">{plan.per}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="h-2 w-2 rounded-full bg-blood shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block mt-auto">
                  <Button className="w-full liquid-btn" variant={plan.popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           TRAINING PROGRAMS
         ══════════════════════════════════════ */}
      <section id="programs" className="relative py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-surface/35 to-void pointer-events-none" />
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-blood/10 blur-[130px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="Built For Results">
            Training <span className="text-blood">Programs</span>
          </SectionHeading>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={endRevealViewport}
              variants={splitImage}
              className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
            >
              <img
                src="https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=1000&q=80&auto=format&fit=crop"
                alt="Training programs"
                className="h-[420px] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-black/35 backdrop-blur-sm border border-white/15 p-4">
                <p className="text-sm uppercase tracking-widest text-blood mb-1">Coach Guided</p>
                <p className="text-white/90 text-sm">Each plan is personalized after your first assessment session.</p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={endRevealViewport}
              variants={splitText}
              className="space-y-5"
            >
              {programs.map((program, i) => (
                <motion.div
                  key={program.title}
                  variants={slideInRight}
                  custom={i}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="rounded-2xl border border-white/10 bg-surface/70 px-5 py-5 hover:border-blood/50 hover:shadow-xl hover:shadow-blood/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blood/20 text-blood">
                      <program.icon size={22} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/50 mb-1">{program.duration}</p>
                      <h3 className="text-lg font-bold text-light mb-1">{program.title}</h3>
                      <p className="text-sm text-white/65 leading-relaxed">{program.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <motion.div variants={fadeUp}>
                <Link to="/register">
                  <Button className="liquid-btn gap-2" size="lg">
                    Start Your Program <ArrowRight size={18} />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           CALL-TO-ACTION
         ══════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=1600&q=80&auto=format&fit=crop"
            alt="Fitness motivation"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={endRevealViewport}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <p className="text-blood uppercase tracking-widest text-sm font-semibold mb-4">
            Take The First Step
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase mb-6 leading-tight">
            Ready to Start Your <span className="text-blood">Fitness Journey?</span>
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Join thousands of members who have transformed their lives.
            Your journey begins today — no excuses, just results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button size="xl" className="gap-2 text-base px-10 liquid-btn">
                  Join Today <ArrowRight size={20} />
                </Button>
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" size="xl" className="text-base px-10 backdrop-blur-sm liquid-btn">
                  Sign In
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
           FOOTER
         ══════════════════════════════════════ */}
      <footer className="relative border-t border-white/5 pt-16 pb-8 px-6">
        {/* Footer background depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-void pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <Link to="/" className="font-display text-2xl font-bold tracking-wider inline-block mb-4">
                Om Muruga <span className="text-blood">Olympia Fitness</span>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed">
                Transform your body, transform your life. Premium fitness experiences since 2024.
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="font-bold text-light mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><a href="#about" className="hover:text-blood transition">About Us</a></li>
                <li><a href="#facilities" className="hover:text-blood transition">Facilities</a></li>
                <li><a href="#plans" className="hover:text-blood transition">Membership</a></li>
                <li><a href="#gallery" className="hover:text-blood transition">Gallery</a></li>
                <li><a href="#programs" className="hover:text-blood transition">Programs</a></li>
              </ul>
            </div>
            {/* Hours */}
            <div>
              <h4 className="font-bold text-light mb-4">Working Hours</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-center gap-2"><Clock size={14} className="text-blood" />Morning: Mon–Sat: 5 AM – 9 AM</li>
                <li className="flex items-center gap-2"><Clock size={14} className="text-blood" />Evening:Mon–Sat: 4 PM – 9 PM</li>
                <li className="flex items-center gap-2"><Clock size={14} className="text-blood" />Sun: Close</li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <h4 className="font-bold text-light mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-center gap-2"><Phone size={14} className="text-blood" /> +91 8925148138</li>
                <li className="flex items-center gap-2"><Mail size={14} className="text-blood" /> massmanikanta70@gmail.com</li>
                <li className="flex items-center gap-2"><MapPin size={14} className="text-blood" /> Vatrap Road, near Petrol Bunk Krishnan Kovil, TN</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} Om Muruga Olympia Fitness. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-white/30">
              <a href="#" className="hover:text-blood transition">Privacy Policy</a>
              <a href="#" className="hover:text-blood transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
