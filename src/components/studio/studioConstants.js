import { FiMessageSquare } from "react-icons/fi";
import {
  TbRobot,
  TbMathSymbols,
  TbGitFork,
  TbBraces,
  TbPercentage
} from "react-icons/tb";

export const STUDIO_VOICES = [
  {
    id: "cimo",
    name: "Cimo",
    gender: "Female",
    accent: "English (US)",
    flag: "🇺🇸",
    tags: ["Customer Support", "Expressive", "Friendly"],
    description: "Warm, empathetic and crystal clear tone tailored for customer engagement.",
    sample: "Hello! I'm Cimo, your conversational assistant. How can I assist you today?",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "chloe",
    name: "Chloe",
    gender: "Female",
    accent: "English (UK)",
    flag: "🇬🇧",
    tags: ["Professional", "Concise", "Executive"],
    description: "Refined British accent with articulate pacing and calm demeanor.",
    sample: "Good day. I am Chloe. Let's make sure everything runs smoothly for you.",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "alex",
    name: "Alex",
    gender: "Male",
    accent: "English (US)",
    flag: "🇺🇸",
    tags: ["Energetic", "Tech", "Sales"],
    description: "High energy, enthusiastic, and confident conversational pacing.",
    sample: "Hey there! I'm Alex. Ready to optimize your workflow and solve any challenges!",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "sarah",
    name: "Sarah",
    gender: "Female",
    accent: "English (US)",
    flag: "🇺🇸",
    tags: ["Natural", "Warm", "Patient"],
    description: "Soothing natural tone with comfortable pacing for complex resolutions.",
    sample: "Hi! I'm Sarah. I'm here to listen and guide you through every step.",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "michael",
    name: "Michael",
    gender: "Male",
    accent: "English (AU)",
    flag: "🇦🇺",
    tags: ["Casual", "Approachable", "Direct"],
    description: "Relaxed, genuine Aussie cadence with authentic inflection.",
    sample: "G'day! I'm Michael. Relax, take your time, and let's get things sorted out.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "emily",
    name: "Emily",
    gender: "Female",
    accent: "English (US)",
    flag: "🇺🇸",
    tags: ["Knowledge", "Consultant", "Clear"],
    description: "Articulate and structured voice designed for deep advisory workflows.",
    sample: "Hello, my name is Emily. I will analyze your inquiry and deliver precise solutions.",
    avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "david",
    name: "David",
    gender: "Male",
    accent: "English (UK)",
    flag: "🇬🇧",
    tags: ["Calm", "Narrator", "Trustworthy"],
    description: "Deep, calm resonance suited for financial services and authoritative guidance.",
    sample: "Good evening. This is David. Your security and confidence are our top priority.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "sophia",
    name: "Sophia",
    gender: "Female",
    accent: "English (US)",
    flag: "🇺🇸",
    tags: ["Gentle", "Healthcare", "Empathy"],
    description: "Kind, reassuring, and gentle cadence ideal for healthcare support.",
    sample: "Hello, I'm Sophia. Please take your time, I'm here to support you with care.",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
  }
];

export const NODE_TEMPLATES = [
  {
    type: "conversation",
    title: "Conversation",
    icon: FiMessageSquare,
    color: "pink",
    iconBg: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    desc: "Speaks prompt to user and awaits speech response"
  },
  {
    type: "function",
    title: "Function",
    icon: TbMathSymbols,
    color: "purple",
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    desc: "Executes backend tool calling or REST API"
  },
  {
    type: "logic_split",
    title: "Logic Split",
    icon: TbGitFork,
    color: "blue",
    iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    desc: "Branches conversation based on condition evaluations"
  },
  {
    type: "extract_variable",
    title: "Extract Variable",
    icon: TbBraces,
    color: "slate",
    iconBg: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    desc: "Extracts custom entities and slots from transcript"
  },
  {
    type: "subagent",
    title: "Subagent",
    icon: TbRobot,
    color: "green",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    desc: "Delegates workflow to an autonomous subagent"
  },
  {
    type: "ending",
    title: "Ending",
    icon: TbPercentage,
    color: "mint",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    desc: "Concludes conversation and hangs up call"
  }
];
