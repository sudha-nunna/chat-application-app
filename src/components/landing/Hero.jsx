import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowUp, Bot, Star, Hash, Box, CreditCard, MessageSquare, Database } from "lucide-react";
import { FiChrome as Chrome } from "react-icons/fi";
import { ImageRevealBackground } from "./ImageRevealBackground";

const phrases = [
  "Create an AI customer support agent",
  "Build a lead generation workflow",
  "Research competitors automatically",
  "Generate content with AI agents",
  "Manage projects using AI",
  "Create a multi-agent workflow"
];

export function Hero() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [items, setItems] = useState(phrases);

  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) => {
        const next = [...prev];
        const first = next.shift();
        next.push(first);
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
   <section ref={containerRef}
     className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-12">
       <ImageRevealBackground />
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div style={{ y: y1, opacity }} className="max-w-8xl mx-auto px-6 md:px-20 relative z-10 w-full flex flex-col pt-6 md:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8 max-w-xl"
          >
            <div className="max-w-[310px] flex items-center gap-3 p-1 bg-white/5 rounded-full">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">PRO</span>
              <span className="text-white/50 text-[10px] font-semibold tracking-widest uppercase">AI AGENTS • WORKFLOWS • AUTOMATION</span>
            </div>
            
            <h1 className="text-4xl sm:text-[3.5rem] md:text-[3.5rem] font-display font-semibold leading-[1.1] tracking-tight text-white">
              Build AI Agents That <br/>
              Actually Get Work Done.
            </h1>
            
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md font-medium">
              Create intelligent AI agents, connect your APIs and tools, add knowledge from PDFs and TXT files, and automate complete workflows from one powerful workspace.
            </p>
            
            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-4">
              <button className="h-12 pl-6 pr-2 text-xs text-nowrap md:text-sm rounded-full bg-gradient-accent text-black font-semibold flex items-center gap-6 transition-all duration-300 hover:scale-105">
                Build Your First Agent
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-black" />
                </div>
              </button>
              <button className="h-13 px-6 text-xs text-nowrap md:text-sm rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all flex items-center">
                Explore the Platform
              </button>
            </div>
            
            {/* <div className="flex items-center gap-4 mt-4 md:mt-8">
              <div className="flex -space-x-3">
                <img src="https://i.pravatar.cc/100?img=33" alt="User" className="w-10 h-10 rounded-full border-2 border-[#030303]" />
                <img src="https://i.pravatar.cc/100?img=47" alt="User" className="w-10 h-10 rounded-full border-2 border-[#030303]" />
                <img src="https://i.pravatar.cc/100?img=12" alt="User" className="w-10 h-10 rounded-full border-2 border-[#030303]" />
                <img src="https://i.pravatar.cc/100?img=42" alt="User" className="w-10 h-10 rounded-full border-2 border-[#030303]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="flex text-orange-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="text-sm font-semibold text-white">4.9 rating</span>
                </div>
                <span className="text-xs text-white/50 font-medium">Create. Connect. Automate. Let AI handle the work.</span>
              </div>
            </div> */}
          </motion.div>

          {/* Right Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full flex flex-col justify-center gap-16 lg:pl-12"
          >
            
            {/* Top Card - Animated List */}
            <div className="relative h-[250px] w-full max-w-[340px] lg:self-end flex flex-col pointer-events-none">
              <AnimatePresence mode="popLayout">
                {items.slice(0, 5).map((text, index) => {
                  const isActive = index === 0;
                  return (
                    <motion.div
                      key={text}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                      transition={{ duration: 0.5, type: "spring", bounce: 0 }}
                      className={
                        isActive
                          ? "glass-panel px-4 py-3 rounded-[24px] bg-white/[0.02] border-white/5 shadow-2xl mb-5 z-20 w-full"
                          : "text-[13px] font-medium mb-3.5 z-10 w-full pl-2"
                      }
                    >
                      {isActive ? (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-[11px] text-white/50 font-medium mb-0.5">I know how to</div>
                            <div className="text-sm font-semibold text-white leading-tight">{text}</div>
                          </div>
                        </div>
                      ) : (
                        <span className={`text-white/${index === 1 ? '80' : index === 2 ? '50' : index === 3 ? '30' : '10'}`}>
                          {text}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* Fade overlay */}
              <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#030303]/10 to-transparent pointer-events-none z-30" />
            </div>
            
            {/* Bottom Group */}
            <div className="flex flex-col  gap-8 lg:self-start w-full">
              {/* Bottom Card */}
              {/* <div className="glass-panel px-6 py-5 rounded-[20px] w-full max-w-[320px] shadow-2xl bg-white/[0.02] border-white/5 flex items-center justify-between">
                <div className="text-sm font-medium text-white/60">Tasks Automated</div>
                <div className="text-right">
                  <div className="text-3xl font-display font-bold text-white tracking-tight">98.4%</div>
                  <div className="text-[11px] text-green-400 flex items-center justify-end font-semibold mt-1">
                    <ArrowUp className="w-3 h-3 mr-0.5" /> +12% this week
                  </div>
                </div>
              </div> */}
              
              <h2 className="text-[2.5rem] md:text-4xl text-end font-display font-medium text-white tracking-tight leading-[1.1]">
                Your AI Agent <br/>
                Don't Sleep.
              </h2>
            </div>

          </motion.div>
          
        </div>

        {/* Bottom Logos */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-full mt-10 flex flex-col items-center"
        >
          <div className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-4 text-center">
            One Platform for Your AI Workforce
          </div>
          <p className="text-white/60 text-sm max-w-2xl text-center mb-8">
            Nexora AI brings agents, knowledge, integrations, workflows, and conversations together in one workspace. Build AI systems that can understand your data, use your tools, and execute tasks for you.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {[
              { name: 'Slack', icon: Hash, color: 'text-blue-400' },
              { name: 'Notion', icon: Box, color: 'text-white' },
              { name: 'Stripe', icon: CreditCard, color: 'text-indigo-400' },
              { name: 'Intercom', icon: MessageSquare, color: 'text-blue-500' },
              { name: 'Databricks', icon: Database, color: 'text-orange-500' },
              { name: 'Google', icon: Chrome, color: 'text-red-400' },
            ].map((company) => (
              <div key={company.name} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer">
                <company.icon className={`w-5 h-5 ${company.color}`} />
                <span className="font-semibold text-sm text-white/80">{company.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
