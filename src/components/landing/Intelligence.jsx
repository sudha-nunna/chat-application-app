import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Search, FileText, Brain, Database, Sparkles, Layers } from 'lucide-react';
import { FiCpu, FiMessageSquare, FiCalendar, FiSearch, FiGrid, FiList, FiCreditCard, FiGlobe, FiFileText, FiCode, FiPlus, FiTrash2, FiEdit2, FiLayers } from 'react-icons/fi';
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
          <div className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-3">AI WORKSPACE</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">
            Talk to Your Agents. Get Work Done.
          </h2>
          <p className="text-white/50 text-lg mb-8 leading-relaxed">
            Interact with your AI agents through a powerful conversational workspace. Ask questions, analyze documents, trigger tasks, and get useful results without switching between multiple tools.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-panel p-5">
              <Database className="w-5 h-5 text-blue-500 mb-3" />
              <h4 className="font-medium text-sm mb-1">Conversational Workspace</h4>
              <p className="text-xs text-white/40">
                Interact naturally with your agents.
              </p>
            </div>
            <div className="glass-panel p-5">
              <Layers className="w-5 h-5 text-blue-500 mb-3" />
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
          <div className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-3">AI AGENTS</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">Create AI Agents for Real Work.</h2>
          <p className="text-white/50 max-w-2xl mx-auto text-lg">Build specialized AI agents with their own instructions, knowledge, tools, and capabilities. Give every agent a clear purpose and let it handle repetitive and complex tasks.</p>
        </div>

        <div className="relative rounded-2xl overflow-hidden group bg-[#111111] border border-white/5 flex text-white font-sans w-full aspect-video shadow-2xl">
          {/* Sidebar */}
          <div className="w-[60px] bg-[#000000] border-r border-white/5 flex flex-col items-center py-5 gap-7 z-10 shrink-0">
            <div className="text-white mb-2 font-black text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="12" cy="12" r="4" fill="white" />
              </svg>
            </div>
            <FiSearch className="text-white/40 hover:text-white transition cursor-pointer text-lg" />
            <FiMessageSquare className="text-white/40 hover:text-white transition cursor-pointer text-lg" />
            <FiCalendar className="text-white/40 hover:text-white transition cursor-pointer text-lg" />
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white cursor-pointer shadow-inner shadow-white/10">
              <FiGrid className="text-lg" />
            </div>
            <FiCreditCard className="text-white/40 hover:text-white transition cursor-pointer text-lg" />
            <FiList className="text-white/40 hover:text-white transition cursor-pointer text-lg" />
            
            <div className="mt-auto w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold cursor-pointer shadow-lg shadow-blue-600/30">
              YA
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col p-6 lg:p-8 bg-[#111111] overflow-hidden relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 z-10">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-[22px] font-bold">Multi-Agent AI Applications</h3>
                  <span className="text-[9px] text-[#db5a3c] font-bold tracking-widest uppercase bg-[#db5a3c]/10 px-1.5 py-0.5 rounded">Production Architecture</span>
                </div>
                <p className="text-white/60 text-[13px]">Application Workspaces — Shared Knowledge Base, Shared APIs & Specialized Agents (Chat, Voice, Avatar, Action, Hybrid).</p>
              </div>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 transition rounded-xl text-xs font-semibold flex items-center gap-2">
                <FiPlus /> Create Agent / Application
              </button>
            </div>

            {/* Shared Resources Banner */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 px-5 mb-8 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-white/5">
                  <FiLayers className="text-white/70 text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-[13px] mb-0.5">Application Workspace Shared Resources</div>
                  <div className="text-white/50 text-[11px]">Agents inside the same application automatically share PDFs, vector embeddings, system rules & REST APIs without duplicate uploads.</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/5 text-[11px] font-bold text-white/90">3 Active Agents</span>
                <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/5 text-[11px] font-bold text-white/90">Shared Memory Active</span>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 z-10">
              {/* Card 1 */}
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition group cursor-pointer flex flex-col min-h-[160px]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#222222] border border-white/5 flex items-center justify-center">
                      <FiCpu className="text-white/80" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">reader</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80">GPT-4.1-MINI</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
                          <FiGlobe /> Hybrid Agent
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <FiEdit2 className="text-white/40 hover:text-white text-xs" />
                    <FiTrash2 className="text-white/40 hover:text-white text-xs" />
                  </div>
                </div>
                <div className="text-white/60 text-xs mb-6">Reading The Doc</div>
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><FiFileText /> 1 Files</span>
                    <span className="flex items-center gap-1.5"><FiCode /> 0 APIs</span>
                  </div>
                  <span className="font-bold hover:text-white flex items-center gap-1"><FiPlus /> API Keys</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition group cursor-pointer flex flex-col min-h-[160px]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#222222] border border-white/5 flex items-center justify-center">
                      <FiCpu className="text-white/80" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">nexos</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80">CLAUDE-3.5-SONNET</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
                          <FiGlobe /> Hybrid Agent
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <FiEdit2 className="text-white/40 hover:text-white text-xs" />
                    <FiTrash2 className="text-white/40 hover:text-white text-xs" />
                  </div>
                </div>
                <div className="text-white/60 text-xs mb-6">Testing Bot</div>
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><FiFileText /> 1 Files</span>
                    <span className="flex items-center gap-1.5"><FiCode /> 0 APIs</span>
                  </div>
                  <span className="font-bold hover:text-white flex items-center gap-1"><FiPlus /> API Keys</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition group cursor-pointer flex flex-col min-h-[160px]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#222222] border border-white/5 flex items-center justify-center">
                      <FiCpu className="text-white/80" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">nouso</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80">GPT-4O</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
                          <FiGlobe /> Hybrid Agent
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <FiEdit2 className="text-white/40 hover:text-white text-xs" />
                    <FiTrash2 className="text-white/40 hover:text-white text-xs" />
                  </div>
                </div>
                <div className="text-white/60 text-xs mb-6">Testing Bot</div>
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><FiFileText /> 1 Files</span>
                    <span className="flex items-center gap-1.5"><FiCode /> 0 APIs</span>
                  </div>
                  <span className="font-bold hover:text-white flex items-center gap-1"><FiPlus /> API Keys</span>
                </div>
              </div>
            </div>

            {/* Floating Chat Icon */}
            <div className="absolute bottom-6 right-6 w-[42px] h-[42px] rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition cursor-pointer shadow-lg shadow-black/50 z-20">
              <FiMessageSquare className="text-lg" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
