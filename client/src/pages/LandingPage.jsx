import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  Star,
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
    img: "https://images.unsplash.com/photo-1521290228999-bdd87ce1e531?w=600&q=80&auto=format&fit=crop",
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

const plans = [
  { duration: "1 Month", price: "₹500", per: "/month", features: ["Unlimited Gym Access", "All Equipment", "Basic Support"] },
  { duration: "6 Months", price: "₹2,500", per: "/6 months", features: ["Unlimited Gym Access", "All Equipment", "Priority Support", "Monthly Fitness Report"], popular: true },
  { duration: "1 Year", price: "₹5,000", per: "/year", features: ["Unlimited Gym Access", "All Equipment", "Priority Support", "Monthly Fitness Report", "Free Personal Training", "Nutrition Consultation"] },
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

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Member since 2024",
    feedback: "Transformed my fitness journey in just 6 months. The trainers are amazing and the equipment is world-class!",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=80&auto=format&fit=crop&crop=face",
  },
  {
    name: "Priya Singh",
    role: "Member since 2023",
    feedback: "Best gym experience ever. Clean facilities, supportive community, and flexible timings that fit my schedule.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop&crop=face",
  },
  {
    name: "Amit Patel",
    role: "Member since 2024",
    feedback: "Professional trainers and modern equipment. Lost 15 kg in 4 months. Highly recommended for everyone!",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop&crop=face",
  },
  {
    name: "Sneha Rao",
    role: "Member since 2025",
    feedback: "The personalized nutrition plan combined with training has given me results I never thought possible.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop&crop=face",
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

const fadeLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

function SectionHeading({ sub, children }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
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
      <div className="h-1 w-20 bg-blood mx-auto rounded-full" />
    </motion.div>
  );
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-void text-light overflow-x-hidden">
      {/* ── Navbar ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-void/80 backdrop-blur-lg border-b border-white/5">
        <Link to="/" className="font-display text-2xl font-bold tracking-wider">
          GYM<span className="text-blood">WEB</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <a href="#about" className="hover:text-blood transition">About</a>
          <a href="#facilities" className="hover:text-blood transition">Facilities</a>
          <a href="#gallery" className="hover:text-blood transition">Gallery</a>
          <a href="#plans" className="hover:text-blood transition">Plans</a>
          <a href="#testimonials" className="hover:text-blood transition">Reviews</a>
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
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeLeft}
              className="relative"
            >
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden group shadow-2xl shadow-black/50">
                <img
                  src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&auto=format&fit=crop"
                  alt="Gym interior"
                  className="w-full h-[440px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>
              {/* Small secondary image offset */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
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
                viewport={{ once: true }}
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
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeRight}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold text-blood mb-3">Our Mission</h3>
                <p className="text-white/70 leading-relaxed">
                  To empower individuals to achieve their fitness goals through expert guidance,
                  modern facilities, and a welcoming community environment that inspires greatness.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blood mb-3">Our Vision</h3>
                <p className="text-white/70 leading-relaxed">
                  To be the most trusted fitness destination, known for transforming lives
                  and building a healthier, stronger community — one member at a time.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blood mb-3">Why Choose Us</h3>
                <p className="text-white/70 leading-relaxed">
                  With over a decade of excellence we combine cutting-edge equipment,
                  certified trainers, and personalized programs to ensure real, lasting results.
                </p>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { val: "500+", label: "Members" },
                  { val: "15+", label: "Trainers" },
                  { val: "24/7", label: "Access" },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-xl bg-white/5 border border-white/10 py-3">
                    <p className="text-xl font-bold text-blood font-display">{s.val}</p>
                    <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <Link to="/register">
                <Button size="lg" className="gap-2 mt-4">
                  Join Us Today <ArrowRight size={18} />
                </Button>
              </Link>
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group flex flex-col rounded-2xl border border-white/10 bg-surface/60 overflow-hidden hover:border-blood/50 hover:shadow-xl hover:shadow-blood/10 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blood shadow-lg shadow-blood/40">
                    <f.icon size={24} className="text-white" />
                  </div>
                </div>
                {/* Text */}
                <div className="flex-1 p-5">
                  <h3 className="text-lg font-bold text-light mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
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
                viewport={{ once: true, margin: "-60px" }}
                variants={scaleIn}
                custom={i}
                whileHover={{ scale: 1.04, transition: { duration: 0.25 } }}
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
                viewport={{ once: true, margin: "-40px" }}
                variants={scaleIn}
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

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.duration}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className={`flex flex-col rounded-2xl border-2 p-8 backdrop-blur-md transition-all duration-300 ${
                  plan.popular
                    ? "border-blood bg-gradient-to-br from-blood/25 to-surface/90 md:scale-105 shadow-2xl shadow-blood/20"
                    : "border-white/10 bg-surface/80 hover:border-blood/40 hover:shadow-lg hover:shadow-blood/10"
                }`}
              >
                {plan.popular && (
                  <div className="mb-4 inline-block bg-blood text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.duration}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-blood">{plan.price}</span>
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
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           TESTIMONIALS
         ══════════════════════════════════════ */}
      <section id="testimonials" className="relative py-28 px-6">
        {/* Background depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-void via-surface/40 to-void pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-blood/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading sub="Real Results">
            Member <span className="text-blood">Stories</span>
          </SectionHeading>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="flex flex-col rounded-2xl border border-white/10 bg-surface/70 p-6 hover:border-blood/50 hover:shadow-xl hover:shadow-blood/10 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={16} className="fill-blood text-blood" />
                  ))}
                </div>
                {/* Feedback */}
                <p className="text-white/65 text-sm mb-6 italic leading-relaxed flex-1">
                  &ldquo;{t.feedback}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3 mt-auto">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-blood/40 shadow-md"
                    loading="lazy"
                  />
                  <div>
                    <p className="font-semibold text-light text-sm">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
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
          viewport={{ once: true, margin: "-80px" }}
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
                <Button size="xl" className="gap-2 text-base px-10">
                  Join Today <ArrowRight size={20} />
                </Button>
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" size="xl" className="text-base px-10 backdrop-blur-sm">
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
                GYM<span className="text-blood">WEB</span>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed">
                Transform your body, transform your life. Premium fitness experiences since 2015.
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
              </ul>
            </div>
            {/* Hours */}
            <div>
              <h4 className="font-bold text-light mb-4">Working Hours</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-center gap-2"><Clock size={14} className="text-blood" /> Mon–Fri: 6 AM – 11 PM</li>
                <li className="flex items-center gap-2"><Clock size={14} className="text-blood" /> Sat–Sun: 7 AM – 10 PM</li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <h4 className="font-bold text-light mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-center gap-2"><Phone size={14} className="text-blood" /> +91 XXXX XXXX XX</li>
                <li className="flex items-center gap-2"><Mail size={14} className="text-blood" /> info@gymweb.com</li>
                <li className="flex items-center gap-2"><MapPin size={14} className="text-blood" /> Gym Street, City</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} GymWeb. All rights reserved.
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
