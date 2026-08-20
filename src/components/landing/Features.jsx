import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import {
  BrainCircuit,
  Database,
  Network,
  MessageSquare,
  Zap,
  Shield,
  Key,
} from "lucide-react";

export function TimelineSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const cubic = [0.65, 0, 0.35, 1];

  const getNodeAnimation = (i) => {
    const t_start = 0.0625 + i * 0.1875;
    const t_fill = t_start + 0.0625;
    const t_end = t_start + 0.125;
    const t_sweep_start = 0.7501;
    const t_sweep_peak = 0.8125;
    const t_reset = 0.9375;

    return {
      svgRotation: {
        values: [0, 0, 360, 360, 0],
        times: [0, t_start, t_end, t_reset, 1],
      },
      bg: {
        values: [
          "rgba(0,0,0,1)",
          "rgba(0,0,0,1)",
          "rgba(59,130,246,1)",
          "rgba(59,130,246,1)",
          "rgba(147,197,253,1)",
          "rgba(0,0,0,1)",
          "rgba(0,0,0,1)",
        ],
        times: [0, t_start, t_fill, t_sweep_start, t_sweep_peak, t_reset, 1],
      },
      shadow: {
        values: [
          "0px 0px 0px rgba(59,130,246,0)",
          "0px 0px 0px rgba(59,130,246,0)",
          "0px 0px 40px rgba(59,130,246,0.8)",
          "0px 0px 15px rgba(59,130,246,0.3)",
          "0px 0px 15px rgba(59,130,246,0.3)",
          "0px 0px 60px rgba(103,232,249,0.8)",
          "0px 0px 0px rgba(59,130,246,0)",
          "0px 0px 0px rgba(59,130,246,0)",
        ],
        times: [
          0,
          t_start,
          t_fill,
          t_end,
          t_sweep_start,
          t_sweep_peak,
          t_reset,
          1,
        ],
      },
      borderDash: {
        values: [195, 195, 0, 0, 195, 195],
        times: [0, t_start, t_end, t_reset, t_reset + 0.01, 1],
      },
      borderOpacity: {
        values: [0, 1, 1, 1, 0, 0],
        times: [0, t_start, t_end, t_reset - 0.05, t_reset, 1],
      },
      text: {
        values: [
          "rgba(255,255,255,0.3)",
          "rgba(255,255,255,0.3)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,0.3)",
          "rgba(255,255,255,0.3)",
        ],
        times: [0, t_start, t_fill, t_sweep_start, t_sweep_peak, t_reset, 1],
      },
      textOpacity: {
        values: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
        times: [0, t_start, t_fill, t_sweep_start, t_sweep_peak, t_reset, 1],
      },
    };
  };

  const steps = [
    {
      title: "Create Your Agent",
      desc: "Define your agent's purpose, instructions, and capabilities.",
    },
    {
      title: "Connect Knowledge & Tools",
      desc: "Add PDFs, TXT files, APIs, and the tools your agent needs.",
    },
    {
      title: "Build Your Workflow",
      desc: "Connect triggers, agents, actions, and integrations into an automated flow.",
    },
    {
      title: "Run & Improve",
      desc: "Execute your workflow, review the results, and continuously improve your agents.",
    },
  ];

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-32 bg-[#030303] px-6 md:px-12 relative overflow-hidden flex flex-col items-center justify-center min-h-[60vh]"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="text-center"
      >
        <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">HOW IT WORKS</div>
        <h2 className="text-3xl md:text-5xl font-display mb-6">
          From Idea to Automation in Minutes.
        </h2>
      </motion.div>

      <div className="w-full overflow-x-auto pb-12 hide-scrollbar">
        <div className="relative min-w-[800px] max-w-6xl mx-auto h-64 flex flex-col justify-center">
          {/* Base thin gray line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#2A2A2A] -translate-y-1/2" />

          {/* Drawn glowing blue line */}
          <motion.div
            className="absolute top-1/2 left-0 h-px bg-[#3B82F6] -translate-y-1/2 origin-left"
            style={{ boxShadow: "0 0 10px rgba(59,130,246,0.6)" }}
            animate={{
              width: [
                "0%",
                "12.5%",
                "12.5%",
                "37.5%",
                "37.5%",
                "62.5%",
                "62.5%",
                "87.5%",
                "87.5%",
                "100%",
                "100%",
                "0%",
                "0%",
              ],
              opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            }}
            transition={{
              width: {
                duration: 8,
                times: [
                  0, 0.0625, 0.1875, 0.25, 0.375, 0.4375, 0.5625, 0.625, 0.75,
                  0.8125, 0.9375, 0.999, 1,
                ],
                ease: [
                  cubic,
                  "linear",
                  cubic,
                  "linear",
                  cubic,
                  "linear",
                  cubic,
                  "linear",
                  cubic,
                  "linear",
                  "linear",
                  "linear",
                ],
                repeat: Infinity,
              },
              opacity: {
                duration: 8,
                times: [
                  0, 0.0625, 0.1875, 0.25, 0.375, 0.4375, 0.5625, 0.625, 0.75,
                  0.8125, 0.9375, 0.999, 1,
                ],
                ease: "linear",
                repeat: Infinity,
              },
            }}
          >
            {/* Comet Head */}
            <div
              className="absolute right-0 top-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent to-cyan-300 -translate-y-1/2"
              style={{
                filter: "blur(1px)",
                boxShadow:
                  "2px 0 15px 4px rgba(59,130,246,0.8), 2px 0 30px 8px rgba(34,211,238,0.4)",
              }}
            />
          </motion.div>

          {/* Final Sweep */}
          <motion.div
            className="absolute top-1/2 h-[2px] w-[30%] bg-gradient-to-r from-transparent via-cyan-200 to-transparent -translate-y-1/2 z-20 pointer-events-none"
            style={{
              filter: "blur(2px)",
              boxShadow: "0 0 30px 10px rgba(103,232,249,0.7)",
            }}
            animate={{
              left: ["-30%", "-30%", "-30%", "100%", "100%", "-30%"],
              opacity: [0, 0, 1, 1, 0, 0],
            }}
            transition={{
              duration: 8,
              times: [0, 0.74, 0.75, 0.875, 0.88, 1],
              ease: ["linear", "linear", cubic, "linear", "linear"],
              repeat: Infinity,
            }}
          />

          {/* Nodes Container */}
          <div className="absolute inset-0 grid grid-cols-4 w-full">
            {steps.map((step, i) => {
              const anim = getNodeAnimation(i);
              return (
                <div
                  key={i}
                  className="flex flex-col justify-center items-center w-full h-full relative z-10"
                >
                  <div className="relative w-16 h-16 flex items-center justify-center rounded-full">
                    {/* SVG Ring Container */}
                    <motion.svg
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      className="absolute inset-0 -rotate-90 origin-center rounded-full"
                      animate={{ rotate: anim.svgRotation.values }}
                      transition={{
                        duration: 8,
                        times: anim.svgRotation.times,
                        ease: cubic,
                        repeat: Infinity,
                      }}
                    >
                      {/* Base Mask & Border */}
                      <circle
                        cx="32"
                        cy="32"
                        r="31"
                        fill="#000000"
                        stroke="#2A2A2A"
                        strokeWidth="1"
                      />

                      {/* Glowing animated border */}
                      <motion.circle
                        cx="32"
                        cy="32"
                        r="31"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeDasharray="195"
                        animate={{
                          strokeDashoffset: anim.borderDash.values,
                          opacity: anim.borderOpacity.values,
                        }}
                        transition={{
                          strokeDashoffset: {
                            duration: 8,
                            times: anim.borderDash.times,
                            ease: cubic,
                            repeat: Infinity,
                          },
                          opacity: {
                            duration: 8,
                            times: anim.borderOpacity.times,
                            ease: "linear",
                            repeat: Infinity,
                          },
                        }}
                        style={{ filter: "drop-shadow(0 0 4px #3B82F6)" }}
                      />
                    </motion.svg>

                    {/* Inner fill */}
                    <motion.div
                      className="absolute inset-1 rounded-full z-10 flex items-center justify-center"
                      animate={{
                        backgroundColor: anim.bg.values,
                        boxShadow: anim.shadow.values,
                      }}
                      transition={{
                        backgroundColor: {
                          duration: 8,
                          times: anim.bg.times,
                          ease: cubic,
                          repeat: Infinity,
                        },
                        boxShadow: {
                          duration: 8,
                          times: anim.shadow.times,
                          ease: cubic,
                          repeat: Infinity,
                        },
                      }}
                    >
                      <motion.span
                        className="text-lg font-display font-medium relative z-20"
                        animate={{ color: anim.text.values }}
                        transition={{
                          duration: 8,
                          times: anim.text.times,
                          ease: cubic,
                          repeat: Infinity,
                        }}
                      >
                        {i + 1}
                      </motion.span>
                    </motion.div>
                  </div>

                  {/* Text below node */}
                  <motion.div
                    className="text-center px-2 absolute top-[calc(50%+4rem)] w-[240px]"
                    animate={{ opacity: anim.textOpacity.values }}
                    transition={{
                      duration: 8,
                      times: anim.textOpacity.times,
                      ease: cubic,
                      repeat: Infinity,
                    }}
                  >
                    <h3 className="font-medium mb-3">{step.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      {step.desc}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function PillarsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const pillars = [
    {
      icon: MessageSquare,
      title: "Less Manual Work",
      desc: "Automate repetitive processes and let AI handle the execution.",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: Database,
      title: "Your Data, Your Knowledge",
      desc: "Bring your own documents and information into your AI workflows.",
      image:
        "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: Network,
      title: "Connected Intelligence",
      desc: "Combine AI agents with APIs, tools, and external services.",
      image:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: Shield,
      title: "One Unified Workspace",
      desc: "Manage agents, knowledge, conversations, workflows, and integrations in one place.",
      image:
        "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: MessageSquare,
      title: "Less Manual Work",
      desc: "Automate repetitive processes and let AI handle the execution.",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: Database,
      title: "Your Data, Your Knowledge",
      desc: "Bring your own documents and information into your AI workflows.",
      image:
        "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800",
    },
  ];

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-32 px-6 md:px-12 bg-[#050505]"
    >
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="mb-10 text-center flex flex-col items-center">
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-display leading-[0.85] tracking-tighter">
            Why Build With
            <br />
            <span className="text-white/20">Nexora AI?</span>
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row w-full gap-4 md:px-8 min-h-[800px] lg:min-h-0 lg:h-[350px]">
          {pillars.map((pillar, i) => {
            const isActive = activeIndex === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`relative min-h-[100px] lg:min-h-0 overflow-hidden rounded-3xl bg-[#0A0A0A] border border-white/[0.05] cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
              ${isActive ? "flex-[3.5]" : "flex-1 hover:flex-[3.5]"}`}
              >
                {/* Background Image */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isActive ? "opacity-100" : "opacity-40"}`}
                >
                  <img
                    src={pillar.image}
                    alt={pillar.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent z-10 pointer-events-none" />

                <div
                  className={`absolute inset-0 bg-gradient-to-br from-interactive-base/20 via-transparent to-interactive-hover/20 transition-opacity duration-700 z-10 pointer-events-none
                ${isActive ? "opacity-100" : "opacity-0"}`}
                />

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col lg:justify-between justify-center p-6 md:p-8 min-w-0">
                  {/* Desktop Icon */}
                  <div
                    className={`hidden lg:flex w-12 h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shrink-0 transition-colors
                  ${isActive ? "text-white" : "text-white/60"}`}
                  >
                    <pillar.icon className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div
                      className={`flex items-center gap-4 transition-all duration-500 ${
                        isActive ? "mb-3" : "mb-0"
                      }`}
                    >
                      {/* Mobile Icon */}
                      <pillar.icon
                        className={`w-5 h-5 lg:hidden transition-colors ${
                          isActive ? "text-white" : "text-white/60"
                        }`}
                      />

                      <h3 className="text-xl md:text-2xl font-display font-medium tracking-tight whitespace-nowrap truncate text-white">
                        {pillar.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <div
                      className={`grid transition-all duration-500 ${
                        isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <p className="overflow-hidden text-sm text-white/60 whitespace-normal lg:min-w-[250px]">
                        <span className="block">{pillar.desc}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export function WorkflowSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-40 bg-[#030303] px-6 md:px-12 relative overflow-hidden"
    >
      <div className="absolute inset-0 z-[-1] bg-[url('/robot-middle.png')] bg-contain lg:bg-cover bg-center bg-no-repeat opacity-80 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303] z-0" />
      <div className="max-w-7xl mx-auto flex flex-col items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">WORKFLOW AUTOMATION</div>
          <h2 className="text-3xl md:text-5xl font-display text-gradient mb-6">
            Turn AI Agents Into Automated Workflows.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Connect triggers, AI agents, tools, APIs, knowledge, and actions into repeatable workflows. Automate the entire process instead of handling every step manually.
          </p>
        </motion.div>

        {/* We will simulate the scroll workflow with a sticky vertical timeline */}
        <div className="relative w-full max-w-3xl flex flex-col items-center">
          <div className="absolute top-0 bottom-0 w-px bg-white/10 left-1/2 -translate-x-1/2" />

          {[
            "Trigger",
            "AI Agent",
            "Knowledge",
            "API / Tool",
            "Action",
            "Result",
          ].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ duration: 0.6 }}
              className={`relative z-10 w-full flex ${i % 2 === 0 ? "justify-end text-end pr-8 md:pr-16" : "justify-start pl-8 md:pl-16"} py-8 lg:py-12`}
            >
              <div
                className={`absolute z-1 top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-[#030303] ${i === 5 ? "bg-green-400" : "bg-blue-500"}`}
              />
              <div className="glass-panel p-6 w-full max-w-sm text-sm">
                {text}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
