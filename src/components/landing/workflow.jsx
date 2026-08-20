import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import { User, FileText, Settings, Database, Brain, History, UserCircle, Cpu, MessageSquare, Layout } from 'lucide-react';

const NODES = [
  { id: 'user', label: 'User', icon: User, desktop: { x: 10, y: 28 }, mobile: { x: 20, y: 5 }, type: 'default' },
  { id: 'input', label: 'Upload Document', icon: FileText, desktop: { x: 10, y: 50 }, mobile: { x: 20, y: 15 }, type: 'default' },
  { id: 'docProc', label: 'Document Processing', icon: Settings, desktop: { x: 30, y: 50 }, mobile: { x: 20, y: 25 }, type: 'default' },
  { id: 'rag', label: 'RAG / Knowledge Base', icon: Database, desktop: { x: 30, y: 75 }, mobile: { x: 20, y: 35 }, type: 'rag' },
  { id: 'history', label: 'Conversation History', icon: History, desktop: { x: 50, y: 10 }, mobile: { x: 80, y: 15 }, type: 'context' },
  { id: 'context', label: 'Session Context', icon: UserCircle, desktop: { x: 50, y: 30 }, mobile: { x: 80, y: 25 }, type: 'context' },
  { id: 'agent', label: 'AI Agent', icon: Brain, desktop: { x: 50, y: 50 }, mobile: { x: 50, y: 48 }, type: 'agent' },
  { id: 'reasoning', label: 'Response Generation', icon: Cpu, desktop: { x: 70, y: 50 }, mobile: { x: 80, y: 62 }, type: 'response' },
  { id: 'formatted', label: 'Response Formatter', icon: MessageSquare, desktop: { x: 90, y: 50 }, mobile: { x: 80, y: 72 }, type: 'response' },
  { id: 'chat', label: 'Chat Interface', icon: Layout, desktop: { x: 90, y: 75 }, mobile: { x: 80, y: 82 }, type: 'response' },
  { id: 'feedback', label: 'User', icon: User, desktop: { x: 70, y: 88 }, mobile: { x: 20, y: 82 }, type: 'feedback' },
  { id: 'learning', label: 'Ask Question', icon: MessageSquare, desktop: { x: 50, y: 88 }, mobile: { x: 20, y: 62 }, type: 'feedback' },
];

const CONNECTIONS = [
  { id: 'c-user-input', from: 'user', to: 'input', color: '#D4AF37', duration: 2.5, particles: 2 },
  { id: 'c-input-doc', from: 'input', to: 'docProc', color: '#D4AF37', duration: 3, particles: 3 },
  { id: 'c-doc-rag', from: 'docProc', to: 'rag', color: '#D4AF37', duration: 2.5, particles: 2 },
  { id: 'c-rag-agent', from: 'rag', to: 'agent', color: '#D4AF37', duration: 3, particles: 3 },
  { id: 'c-hist-ctx', from: 'history', to: 'context', color: '#67E8F9', duration: 3, particles: 2 },
  { id: 'c-ctx-agent', from: 'context', to: 'agent', color: '#67E8F9', duration: 3, particles: 2 },
  { id: 'c-agent-reas', from: 'agent', to: 'reasoning', color: '#FBBF24', duration: 2.5, particles: 3 },
  { id: 'c-reas-form', from: 'reasoning', to: 'formatted', color: '#FBBF24', duration: 2.5, particles: 2 },
  { id: 'c-form-chat', from: 'formatted', to: 'chat', color: '#FBBF24', duration: 3, particles: 3 },
  { id: 'c-chat-feed', from: 'chat', to: 'feedback', color: '#9CA3AF', duration: 4, particles: 1 },
  { id: 'c-feed-learn', from: 'feedback', to: 'learning', color: '#9CA3AF', duration: 4, particles: 1 },
  { id: 'c-learn-agent', from: 'learning', to: 'agent', color: '#9CA3AF', duration: 4, particles: 1 },
];

const getPath = (sourceId, targetId, nodes, isMobile, width, height) => {
  const source = nodes.find(n => n.id === sourceId);
  const target = nodes.find(n => n.id === targetId);
  
  const sPos = isMobile ? source.mobile : source.desktop;
  const tPos = isMobile ? target.mobile : target.desktop;

  const x1 = (sPos.x / 100) * width;
  const y1 = (sPos.y / 100) * height;
  const x2 = (tPos.x / 100) * width;
  const y2 = (tPos.y / 100) * height;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  
  if (dx > dy) {
    return `M ${x1} ${y1} C ${x1 + dx/2} ${y1}, ${x2 - dx/2} ${y2}, ${x2} ${y2}`;
  } else {
    return `M ${x1} ${y1} C ${x1} ${y1 + dy/2}, ${x2} ${y2 - dy/2}, ${x2} ${y2}`;
  }
}

const NodeComponent = ({ node, inView, isMobile }) => {
  let bgClass = "bg-neutral-900/80 border-neutral-800";
  let iconColor = "text-neutral-400";
  let glowColor = "rgba(255,255,255,0)";
  
  if (node.type === 'rag') {
    bgClass = "bg-neutral-900/90 border-[#D4AF37]/40";
    iconColor = "text-[#D4AF37]";
    glowColor = "rgba(212,175,55,0.15)";
  } else if (node.type === 'agent') {
    bgClass = "bg-neutral-900/90 border-[#D4AF37]/60";
    iconColor = "text-[#D4AF37]";
    glowColor = "rgba(212,175,55,0.25)";
  } else if (node.type === 'context') {
    bgClass = "bg-neutral-900/80 border-[#67E8F9]/30";
    iconColor = "text-[#67E8F9]";
  } else if (node.type === 'response') {
    bgClass = "bg-neutral-900/80 border-[#FBBF24]/30";
    iconColor = "text-[#FBBF24]";
  } else if (node.type === 'feedback') {
    bgClass = "bg-neutral-900/80 border-neutral-600/50";
    iconColor = "text-neutral-400";
  }

  const isHighlighted = node.type === 'rag' || node.type === 'agent';
  const Icon = node.icon;
  const pos = isMobile ? node.mobile : node.desktop;

  return (
    <div 
      className="absolute z-10" 
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.6, delay: (pos.x + pos.y) * 0.005, ease: "easeOut" }}
      >
        <div
          // animate={inView ? { y: [0, -4, 0] } : {}}
          // transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
          className={`relative w-[76px] sm:w-[84px] md:w-[92px] lg:w-[76px] xl:w-[86px] flex flex-col items-center p-1.5 xl:p-2 rounded-xl border backdrop-blur-md shadow-2xl ${bgClass}`}
        >
          {isHighlighted && (
            <motion.div 
              className="absolute inset-0 rounded-xl pointer-events-none"
              animate={{ boxShadow: [`0 0 0px ${glowColor}`, `0 0 20px ${glowColor}`, `0 0 0px ${glowColor}`] }}
              transition={{ duration: node.type === 'agent' ? 4 : 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          <div className="relative mb-1.5 xl:mb-2 flex items-center justify-center">
            <div className="relative z-10 p-1.5 rounded-full border border-border-primary bg-interactive-base/80">
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 ${iconColor}`} />
            </div>
            
            {node.type === 'rag' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-1 rounded-full border border-dashed border-[#D4AF37]/40 pointer-events-none"
              />
            )}
            {node.type === 'agent' && (
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-1.5 rounded-full border border-dashed border-[#D4AF37]/30 pointer-events-none"
              />
            )}
          </div>

          <span className="text-[9px] sm:text-[10px] lg:text-[9px] xl:text-[10px] font-medium text-text-muted text-center leading-[1.2]">
            {node.label}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

export default function Workflow() {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const w = isMobile ? 600 : 1000;
  const h = isMobile ? 1400 : 850;

  return (
    <section className="overflow-hidden" ref={containerRef}>
        <div className="w-full relative">
            <div 
              className="relative w-full mx-auto"
              style={{ aspectRatio: `${w} / ${h}` }}
            >
              
              {/* SVG for static paths and particle animations */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
             {CONNECTIONS.map(conn => {
               const pathD = getPath(conn.from, conn.to, NODES, isMobile, w, h);
               return (
                 <motion.path
                   key={conn.id}
                   d={pathD}
                   fill="none"
                   stroke="rgba(255,255,255,0.15)"
                   strokeWidth="2"
                   initial={{ pathLength: 0 }}
                   animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
                   transition={{ duration: 1.5, ease: "easeInOut" }}
                 />
               )
             })}

             {/* SVG Native Particles for flawless responsive scaling */}
             {inView && CONNECTIONS.map(conn => {
                const pathD = getPath(conn.from, conn.to, NODES, isMobile, w, h);
                return (
                  <g key={`particles-${conn.id}`}>
                    {Array.from({ length: conn.particles }).map((_, i) => {
                      const delay = 1.5 + i * (conn.duration / conn.particles);
                      return (
                        <g key={i} opacity="0">
                          <circle r={isMobile ? "5" : "8"} fill={conn.color} opacity="0.4" />
                          <circle r={isMobile ? "2" : "3.5"} fill={conn.color} />
                          <animateMotion
                            dur={`${conn.duration}s`}
                            repeatCount="indefinite"
                            begin={`${delay}s`}
                            path={pathD}
                          />
                          <animate
                            attributeName="opacity"
                            values="0;1;1;0"
                            keyTimes="0;0.1;0.9;1"
                            dur={`${conn.duration}s`}
                            repeatCount="indefinite"
                            begin={`${delay}s`}
                          />
                        </g>
                      )
                    })}
                  </g>
                )
             })}
          </svg>

          {/* Nodes */}
          {NODES.map(node => (
            <NodeComponent key={node.id} node={node} inView={inView} isMobile={isMobile} />
          ))}
            </div>

             {/* Decorative background nodes */}
          <div className="absolute hidden lg:flex inset-0 pointer-events-none flex items-center justify-center">
             <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 border border-white/10 rounded-full border-dashed"
             />
             <motion.div 
                animate={{ rotate: -360 }} 
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute hidden lg:flex w-48 h-48 border border-white/10 rounded-full"
             />
          </div>
        </div>
    </section>
  )
}
