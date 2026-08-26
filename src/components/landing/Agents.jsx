import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Users, Code, Activity, Command, Cloud, CreditCard, MessageSquare, Kanban, Headset, Network, Briefcase } from 'lucide-react';
import { FiGithub as Github } from "react-icons/fi";

export function MultiAgentSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const agents = [
    { name: 'Agents', color: 'border-pink-500/50 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]', icon: Users },
    { name: 'Conversations', color: 'border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]', icon: Activity },
    { name: 'Knowledge', color: 'border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.15)]', icon: Command },
    { name: 'Workflows', color: 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]', icon: Code },
  ];

  const positions = [
    { x: -280, y: -100 },
    { x: -280, y: 100 },
    { x: 280, y: -100 },
    { x: 280, y: 100 },
  ];

  return (
    <motion.section ref={containerRef} style={{ y: y1, opacity }} className="pb-32 pt-16 px-6 md:px-12 bg-[#030303] relative overflow-hidden min-h-screen flex items-center justify-center border-t border-white/5">
      {/* <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03),transparent_70%)]" /> */}
      
      <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col items-center">
        
        {/* Diagram Area */}
        <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] flex items-center justify-center mb-8 md:mb-12">
          <div className="relative w-[1000px] h-[500px] scale-[0.35] sm:scale-[0.6] lg:scale-100 origin-center flex-shrink-0">
          
          {/* SVG Connecting Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-500 -250 1000 500">
             {/* Base Lines */}
             <g stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" strokeLinejoin="round">
               {/* Left branches */}
               <path d="M -70 0 L -140 0 L -180 -100 L -244 -100" />
               <path d="M -70 0 L -140 0 L -180 100 L -244 100" />
               
               {/* Right branches */}
               <path d="M 70 0 L 140 0 L 180 -100 L 244 -100" />
               <path d="M 70 0 L 140 0 L 180 100 L 244 100" />
             </g>

             {/* Animated Flow Lines */}
             <g stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinejoin="round">
               <motion.path 
                 animate={{ strokeDashoffset: [400, 0] }}
                 transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                 strokeDasharray="40 400"
                 d="M -70 0 L -140 0 L -180 -100 L -244 -100" 
               />
               <motion.path 
                 animate={{ strokeDashoffset: [400, 0] }}
                 transition={{ duration: 3, ease: "linear", repeat: Infinity, delay: 0.5 }}
                 strokeDasharray="40 400"
                 d="M -70 0 L -140 0 L -180 100 L -244 100" 
               />
               <motion.path 
                 animate={{ strokeDashoffset: [400, 0] }}
                 transition={{ duration: 3, ease: "linear", repeat: Infinity, delay: 1 }}
                 strokeDasharray="40 400"
                 d="M 70 0 L 140 0 L 180 -100 L 244 -100" 
               />
               <motion.path 
                 animate={{ strokeDashoffset: [400, 0] }}
                 transition={{ duration: 3, ease: "linear", repeat: Infinity, delay: 1.5 }}
                 strokeDasharray="40 400"
                 d="M 70 0 L 140 0 L 180 100 L 244 100" 
               />
             </g>
          </svg>

          {/* Central Block */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140px] h-[140px] rounded-[32px] bg-gradient-to-br from-white/10 to-transparent border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)] backdrop-blur-xl flex flex-col items-center justify-center p-4 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="relative z-10">
              <div className="text-[13px] font-semibold mb-2 text-white tracking-wide">User Request</div>
              <div className="text-[10px] text-white/50 leading-relaxed italic">"Onboard Enterprise Client Acme with 10% discount"</div>
            </div>
          </motion.div>

          {/* Surrounding Agents */}
          {agents.map((agent, i) => {
            const pos = positions[i];
            return (
              <div
                key={i}
                className="absolute z-20"
                style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}
              >
                <motion.div
                  initial={{ opacity: 0, x: pos.x > 0 ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + (i * 0.1), ease: [0.16, 1, 0.3, 1] }}
                  className="absolute flex flex-col items-center gap-4"
                  style={{ left: "-36px", top: "-36px" }}
                >
                  <div className={`w-[72px] h-[72px] rounded-[24px] backdrop-blur-md flex items-center justify-center border ${agent.color} relative overflow-hidden transition-transform duration-300 hover:scale-110`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50" />
                    <agent.icon className="w-7 h-7 text-white relative z-10" />
                  </div>
                  <span className="text-sm font-medium text-white/70 tracking-wide whitespace-nowrap">{agent.name}</span>
                </motion.div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center z-20 relative max-w-2xl mx-auto"
        >
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">THE NEXORA WORKSPACE</div>
          <h2 className="text-4xl md:text-5xl font-display mb-6 tracking-tight">Everything Your Agents Need. In One Place.</h2>
          <p className="text-white/50 text-lg md:text-xl leading-relaxed">
            Create agents, manage conversations, connect knowledge, configure integrations, and automate workflows from a single AI workspace.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}

export function ApiSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const logos = [
    { name: 'Salesforce', icon: <Cloud className="w-6 h-6 md:w-8 md:h-8 text-[#00A1E0] mb-2" /> },
    { name: 'Stripe', icon: <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-[#635BFF] mb-2" /> },
    { name: 'Slack', icon: <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-[#E01E5A] mb-2" /> },
    { name: 'Jira', icon: <Kanban className="w-6 h-6 md:w-8 md:h-8 text-[#0052CC] mb-2" /> },
    { name: 'GitHub', icon: <Github className="w-6 h-6 md:w-8 md:h-8 text-white mb-2" /> },
    { name: 'Zendesk', icon: <Headset className="w-6 h-6 md:w-8 md:h-8 text-[#03363D] mb-2" /> },
    { name: 'HubSpot', icon: <Network className="w-6 h-6 md:w-8 md:h-8 text-[#FF7A59] mb-2" /> },
    { name: 'Google Workspace', icon: <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-[#4285F4] mb-2" /> }
  ];
  
  return (
    <motion.section ref={containerRef} style={{ y: y1, opacity }} className="py-32 px-6 md:px-12 border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
        
        <div className="flex-1">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">API INTEGRATIONS</div>
          <h2 className="text-3xl md:text-5xl font-display mb-6">Connect AI to the Tools You Already Use.</h2>
          <p className="text-white/50 text-lg mb-8 leading-relaxed">
            Connect APIs, services, and external tools to your agents and workflows. Nexora AI helps your agents move beyond conversation and take meaningful actions.
          </p>
          <button className="px-6 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium">
            View All Integrations
          </button>
        </div>

        <div className="flex-1 w-full">
          <div className="flex gap-3 md:gap-4 justify-center">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 mt-0">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="aspect-[4/5] glass-panel flex flex-col items-center justify-center p-2 text-center glass-panel-hover rounded-2xl"
                >
                  {logos[i].icon}
                  <span className="text-[10px] md:text-xs font-medium text-white/60 leading-tight">{logos[i].name}</span>
                </motion.div>
              ))}
            </div>
            
            {/* Column 2 */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 mt-8 md:mt-16">
              {[2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  className="aspect-[4/5] glass-panel flex flex-col items-center justify-center p-2 text-center glass-panel-hover rounded-2xl"
                >
                  {logos[i].icon}
                  <span className="text-[10px] md:text-xs font-medium text-white/60 leading-tight">{logos[i].name}</span>
                </motion.div>
              ))}
            </div>

            {/* Column 3 */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 mt-16 md:mt-32">
              {[4, 7].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className="aspect-[4/5] glass-panel flex flex-col items-center justify-center p-2 text-center glass-panel-hover rounded-2xl"
                >
                  {logos[i].icon}
                  <span className="text-[10px] md:text-xs font-medium text-white/60 leading-tight">{logos[i].name}</span>
                </motion.div>
              ))}
            </div>

            {/* Column 4 */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 mt-0 md:-mt-4">
              {[5, 6].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  className="aspect-[4/5] glass-panel flex flex-col items-center justify-center p-2 text-center glass-panel-hover rounded-2xl"
                >
                  {logos[i].icon}
                  <span className="text-[10px] md:text-xs font-medium text-white/60 leading-tight">{logos[i].name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </motion.section>
  );
}
