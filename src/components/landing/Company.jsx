import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Check, MessageSquare, Database, Wand2, Network } from "lucide-react";

export function IndustriesSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const industries = [
    {
      title: "Research Agents",
      desc1:
        "Analyze information, summarize documents, and generate useful insights.",
    },
    {
      title: "Customer Support",
      desc1:
        "Build agents that understand your knowledge base and help customers faster.",
    },
    {
      title: "Data & Document Analysis",
      desc1:
        "Let AI process documents, extract information, and answer questions using your data.",
    },
    {
      title: "Business Automation",
      desc1:
        "Automate repetitive tasks by connecting agents, APIs, tools, and workflows.",
    },
  ];

  const getShape = (type) => {
    if (type === 0) {
      // Healthcare
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <path
            d="M32 12L50 22V42L32 52L14 42V22L32 12Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="rgba(59,130,246,0.1)"
          />
          <path
            d="M18 32h8l4-8 4 16 4-8h8"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="2" fill="#fff" />
        </svg>
      );
    } else if (type === 1) {
      // Finance
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <rect
            x="16"
            y="34"
            width="8"
            height="16"
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="28"
            y="24"
            width="8"
            height="26"
            fill="rgba(59,130,246,0.3)"
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="40"
            y="14"
            width="8"
            height="36"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="44" cy="14" r="2" fill="#fff" />
          <path d="M 44 14 L 54 14" stroke="currentColor" strokeWidth="1" />
          <path d="M 12 50 L 52 50" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    } else if (type === 2) {
      // Enterprise SaaS
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <ellipse
            cx="32"
            cy="20"
            rx="16"
            ry="6"
            stroke="currentColor"
            strokeWidth="1"
            fill="rgba(59,130,246,0.15)"
          />
          <path
            d="M16 20V44C16 47.3137 23.1634 50 32 50C40.8366 50 48 47.3137 48 44V20"
            stroke="currentColor"
            strokeWidth="1"
          />
          <ellipse
            cx="32"
            cy="32"
            rx="16"
            ry="6"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <ellipse
            cx="32"
            cy="44"
            rx="16"
            ry="6"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle cx="32" cy="20" r="2" fill="#fff" />
        </svg>
      );
    } else if (type === 3) {
      // Manufacturing
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <path
            d="M32 16L48 24V40L32 48L16 40V24L32 16Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
            fill="rgba(59,130,246,0.1)"
          />
          <path
            d="M32 48V32M16 24L32 32M48 24L32 32"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="16" r="2" fill="currentColor" />
          <circle cx="48" cy="24" r="2" fill="currentColor" />
          <circle cx="16" cy="24" r="2" fill="currentColor" />
          <circle cx="32" cy="48" r="2" fill="currentColor" />
          <circle cx="32" cy="32" r="2" fill="#fff" />
        </svg>
      );
    } else if (type === 4) {
      // Education
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <path
            d="M14 26L32 16L50 26L32 36L14 26Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="rgba(59,130,246,0.15)"
            strokeLinejoin="round"
          />
          <path
            d="M20 30V40C20 44 32 48 32 48C32 48 44 44 44 40V30"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M50 26V40"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="36" r="2" fill="#fff" />
          <circle cx="50" cy="40" r="2" fill="currentColor" />
        </svg>
      );
    } else {
      // Retail
      return (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="scale-[1.3] opacity-90"
        >
          <rect
            x="20"
            y="24"
            width="24"
            height="24"
            rx="2"
            stroke="currentColor"
            strokeWidth="1"
            fill="rgba(59,130,246,0.1)"
          />
          <path
            d="M26 24V18C26 14.686 28.686 12 32 12C35.314 12 38 14.686 38 18V24"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="32" cy="36" r="2" fill="#fff" />
          <circle cx="20" cy="24" r="2" fill="currentColor" />
          <circle cx="44" cy="24" r="2" fill="currentColor" />
        </svg>
      );
    }
  };

  const getTechLines = (type) => {
    if (type === 0) {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 0 75 L 60 75 L 60 150"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="60" cy="75" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 200 120 L 140 120 L 140 50"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="140" cy="120" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    } else if (type === 1) {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 40 150 L 40 60 L 80 60"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="40" cy="60" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 120 40 L 160 40 L 160 0"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="160" cy="40" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    } else if (type === 2) {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 0 110 L 70 110 L 70 50"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="70" cy="110" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 130 90 L 130 30 L 200 30"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="130" cy="30" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    } else if (type === 3) {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 50 0 L 50 80 L 0 80"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="50" cy="80" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 150 150 L 150 70 L 200 70"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="150" cy="70" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    } else if (type === 4) {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 0 40 L 80 40 L 80 150"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="80" cy="40" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 200 110 L 120 110 L 120 0"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="120" cy="110" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    } else {
      return (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 150"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 200 60 L 140 60 L 140 150"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="140" cy="60" r="2" fill="rgba(255,255,255,0.4)" />
          <path
            d="M 0 90 L 60 90 L 60 0"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle cx="60" cy="90" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );
    }
  };

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-32 bg-[#030303] px-6 md:px-12 relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">BUILT FOR REAL WORK</div>
          <h2 className="text-4xl md:text-5xl font-display mb-6 tracking-tight">
            One AI Platform. Endless Possibilities.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {industries.map((ind, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                delay: i * 0.1,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative flex flex-col items-center bg-gradient-to-b from-[#080d20] to-[#03050a] border border-blue-500/10 rounded-[32px] p-6 pb-12 shadow-[0_0_40px_-15px_rgba(30,58,138,0.3)] hover:border-blue-500/30 transition-colors duration-500 group"
            >
              {/* Top illustration area */}
              <div className="w-full aspect-[6/3] relative rounded-[24px] overflow-hidden bg-gradient-to-b from-blue-900/10 to-transparent border border-white/5 mb-8 flex items-center justify-center shadow-inner">
                {/* Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />

                {/* Tech lines */}
                {getTechLines(i)}

                {/* Main glowing shape */}
                <div className="relative z-10 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] group-hover:scale-110 group-hover:drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] transition-all duration-700 ease-out">
                  {getShape(i)}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-display text-white/90 text-center tracking-wide mb-6">
                {ind.title}
              </h3>

              {/* Descriptions */}
              <div className="flex flex-col gap-3 w-full">
                <div className="bg-gradient-to-b from-blue-900/40 to-blue-950/20 border border-blue-500/20 rounded-2xl p-4 text-center">
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    {ind.desc1}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function CtaSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-32 px-6 md:px-12 bg-[#050505] relative"
    >
      <div className="absolute inset-0 z-0 bg-[url('/footer-bg.png')] bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="text-[11px] font-bold text-text-primary uppercase tracking-widest mb-4">READY TO AUTOMATE?</div>
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-display tracking-tight font-medium mb-8">
          Build Your AI Workforce Today.
        </h2>
        <p className="text-white/50 text-sm md:text-xl max-w-2xl mx-auto mb-12">
          Create intelligent agents, connect your data and tools, and turn repetitive work into automated workflows.
        </p>
        <div className="flex gap-4">
          <button className="sm:px-8 px-6 sm:py-4 py-3 text-sm sm:text-base rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all shadow-lg">Start Building</button>
          <button className="sm:px-8 px-6 sm:py-4 py-3 text-sm sm:text-base rounded-full glass-panel font-medium hover:bg-white/10 transition-all border border-white/10 text-white/80">Open Nexora AI</button>
        </div>
        <p className="mt-8 text-sm text-white/40">Your agents are ready to work.</p>
      </div>
    </motion.section>
  );
}

export function RoadmapSection() {
  return null;
}
