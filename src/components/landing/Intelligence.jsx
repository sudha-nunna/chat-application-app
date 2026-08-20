import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Search, FileText, Brain, Database, Sparkles, Layers } from 'lucide-react';
import Workflow from './workflow';

export function DocumentSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section ref={containerRef} style={{ y: y1, opacity }} className="py-32 bg-[#050505] px-6 md:px-12 border-t border-white/5 relative">
      <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-interactive-base/10 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">AI KNOWLEDGE</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">Give Your Agents the Knowledge They Need.</h2>
          <p className="text-white/50 text-lg mb-8 leading-relaxed">
            Upload PDFs, TXT files, and other documents to give your agents access to the information that matters to your business. Turn your files into searchable AI knowledge.
          </p>
          <ul className="space-y-4 text-white/70">
            {['Upload Documents', 'Context-Aware Answers', 'Knowledge-Powered Workflows', 'Searchable AI knowledge'].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-400" /> {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* <div className="relative h-[500px] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full max-w-md glass-panel p-1 relative z-10"
          >
            <div className="bg-[#0a0a0a] rounded-xl p-6 h-full">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <Search className="w-5 h-5 text-white/40" />
                <div className="text-sm text-white/50 font-mono">"What is our Q3 leave policy?"</div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <p className="text-sm leading-relaxed mb-3">According to the updated Employee Handbook (v2.4), Q3 leave requires a 2-week notice and approval from department head.</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-white/50 flex items-center gap-1"><FileText className="w-3 h-3"/> Handbook.pdf (Pg 12)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
         
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="w-80 h-80 border border-white/5 rounded-full border-dashed"
             />
             <motion.div 
                animate={{ rotate: -360 }} 
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute w-96 h-96 border border-white/5 rounded-full"
             />
          </div>
        </div> */}

        <div>
        <Workflow />
       </div>
      </div>
    </motion.section>
  );
}

export function MemorySection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      style={{ y: y1, opacity }}
      className="py-32 px-6 md:px-12 bg-[#030303] relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
        <div className="flex-1 w-full relative">
          {/* <div className="absolute inset-0 flex items-center justify-center">
            
            <motion.div className="relative w-64 h-64">
              <div className="absolute inset-0 bg-interactive-base/20 blur-[80px] rounded-full" />
              <div className="absolute inset-0 rounded-full border border-white/10 flex items-center justify-center">
                <Brain className="w-8 h-8 text-white/50" />
              </div>
              
              
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    rotate: 360,
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: -i*3 }}
                  className="absolute inset-0"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/20 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </motion.div>
              ))}
            </motion.div>
          </div> */}
          <img
            src="/irobot.png"
            alt="img"
            className="w-full h-full object-cover 
            drop-shadow-[0_0_20px_rgba(99,102,241,0.45)]
       drop-shadow-[0_0_40px_rgba(99,102,241,0.45)
       drop-shadow-[0_0_80px_rgba(59,130,246,0.25) [mask-image:linear-gradient(to_bottom,black_75%,transparent_100%)]
      [-webkit-mask-image:linear-gradient(to_bottom,black_75%,transparent_100%)]"
          />
        </div>

        <div className="flex-1">
          <div className="text-[11px] font-bold text-text-primary uppercase tracking-widest mb-3">AI WORKSPACE</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">
            Talk to Your Agents. Get Work Done.
          </h2>
          <p className="text-white/50 text-lg mb-8 leading-relaxed">
            Interact with your AI agents through a powerful conversational workspace. Ask questions, analyze documents, trigger tasks, and get useful results without switching between multiple tools.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-panel p-5">
              <Database className="w-5 h-5 text-text-primary mb-3" />
              <h4 className="font-medium text-sm mb-1">Conversational Workspace</h4>
              <p className="text-xs text-white/40">
                Interact naturally with your agents.
              </p>
            </div>
            <div className="glass-panel p-5">
              <Layers className="w-5 h-5 text-text-primary mb-3" />
              <h4 className="font-medium text-sm mb-1">Actionable Results</h4>
              <p className="text-xs text-white/40">
                One conversation can start an entire workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function StudioSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section ref={containerRef} style={{ y: y1, opacity }} className="py-32 bg-[#050505] px-6 md:px-12 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <div className="text-[11px] font-bold text-text-primary uppercase tracking-widest mb-3">AI AGENTS</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">Create AI Agents for Real Work.</h2>
          <p className="text-white/50 max-w-2xl mx-auto text-lg">Build specialized AI agents with their own instructions, knowledge, tools, and capabilities. Give every agent a clear purpose and let it handle repetitive and complex tasks.</p>
        </div>

        <div className="relative rounded-2xl glass-panel p-4 md:p-8 aspect-video max-h-[700px] overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000" />
          
          <div className="relative z-10 w-full h-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col">
            {/* Fake Builder UI */}
            <div className="flex gap-4 border-b border-white/5 pb-4 mb-6">
              <div className="w-3 h-3 rounded-full bg-interactive-base/50" />
              <div className="w-3 h-3 rounded-full bg-interactive-base/50" />
              <div className="w-3 h-3 rounded-full bg-interactive-base/50" />
            </div>

            <div className="flex flex-1 gap-6">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 pr-6 hidden md:block">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">Components</div>
                <div className="space-y-3">
                  {['Specialized Agents', 'Custom Instructions', 'Tool Access', 'Knowledge Base', 'API Triggers'].map((item, i) => (
                    <div key={i} className="px-4 py-3 bg-white/5 rounded-lg text-sm flex items-center justify-between cursor-move hover:bg-white/10 transition-colors">
                      {item}
                      <span className="text-white/20">⋮⋮</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative border border-white/5 border-dashed rounded-xl bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:1rem_1rem]">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  className="absolute top-1/4 left-1/4 glass-panel p-4 w-64 shadow-2xl"
                >
                  <div className="text-xs font-medium text-text-primary mb-2">Trigger</div>
                  <div className="text-sm">When Zendesk Ticket Created</div>
                </motion.div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-1/2 left-1/2 glass-panel p-4 w-64 shadow-2xl"
                >
                  <div className="text-xs font-medium text-text-primary mb-2">Action</div>
                  <div className="text-sm">Summarize & Draft Response</div>
                </motion.div>
                
                {/* SVG connection line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path d="M 250 150 Q 250 250 350 250" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4 4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
