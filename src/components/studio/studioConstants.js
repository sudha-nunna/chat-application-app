import { FiMessageSquare, FiPhoneCall, FiSend, FiCode, FiFileText } from "react-icons/fi";
import {
  TbRobot,
  TbMathSymbols,
  TbGitFork,
  TbBraces,
  TbPercentage,
  TbDialpad,
  TbArrowsRightLeft,
  TbPlugConnected,
  TbFileDescription
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
    sampleText: "Hello! I'm Cimo, your conversational assistant. How can I assist you today?",
    persona: "Warm Female",
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
    sampleText: "Good day. I am Chloe. Let's make sure everything runs smoothly for you.",
    persona: "Professional Female",
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
    sampleText: "Hey there! I'm Alex. Ready to optimize your workflow and solve any challenges!",
    persona: "Energetic Male",
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
    sampleText: "Hi! I'm Sarah. I'm here to listen and guide you through every step.",
    persona: "Warm Female",
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
    sampleText: "G'day! I'm Michael. Relax, take your time, and let's get things sorted out.",
    persona: "Casual Male",
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
    sampleText: "Hello, my name is Emily. I will analyze your inquiry and deliver precise solutions.",
    persona: "Knowledge Consultant",
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
    sampleText: "Good evening. This is David. Your security and confidence are our top priority.",
    persona: "Calm Male",
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
    sampleText: "Hello, I'm Sophia. Please take your time, I'm here to support you with care.",
    persona: "Gentle Female",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
  }
];

export const PRESET_VOICES = STUDIO_VOICES;

export const getVoiceProfileById = (voiceId) => {
  if (!voiceId) return STUDIO_VOICES[0];
  const target = String(voiceId).toLowerCase();

  const direct = STUDIO_VOICES.find(
    (v) => v.id.toLowerCase() === target || v.name.toLowerCase() === target
  );
  if (direct) return direct;

  if (target === "casual-male" || target.includes("michael")) {
    return STUDIO_VOICES.find((v) => v.id === "michael") || STUDIO_VOICES[4];
  }
  if (target === "energetic-male" || target.includes("alex")) {
    return STUDIO_VOICES.find((v) => v.id === "alex") || STUDIO_VOICES[2];
  }
  if (target === "professional-female" || target.includes("emily")) {
    return STUDIO_VOICES.find((v) => v.id === "emily") || STUDIO_VOICES[5];
  }
  if (target === "default-en" || target.includes("sarah")) {
    return STUDIO_VOICES.find((v) => v.id === "sarah") || STUDIO_VOICES[3];
  }

  return STUDIO_VOICES[0];
};

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
    type: "subagent",
    title: "Subagent",
    icon: TbRobot,
    color: "green",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    desc: "Delegates workflow to an autonomous subagent"
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
    type: "call_transfer",
    title: "Call Transfer",
    icon: FiPhoneCall,
    color: "yellow",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    desc: "Transfers ongoing call to phone number or SIP endpoint"
  },
  {
    type: "press_digit",
    title: "Press Digit",
    icon: TbDialpad,
    color: "blue",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    desc: "Solicits DTMF keypad digit inputs during call"
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
    type: "agent_transfer",
    title: "Agent Transfer",
    icon: TbArrowsRightLeft,
    color: "purple",
    iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    desc: "Hands over conversation to another AI agent"
  },
  {
    type: "in_call_sms",
    title: "In-Call SMS",
    icon: FiSend,
    color: "green",
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    desc: "Triggers automated text message during active call"
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
    type: "code",
    title: "Code",
    icon: FiCode,
    color: "slate",
    iconBg: "bg-slate-600/15 text-slate-700 dark:text-slate-300",
    desc: "Executes custom inline JavaScript logic"
  },
  {
    type: "mcp",
    title: "MCP",
    icon: TbPlugConnected,
    color: "purple",
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    desc: "Integrates external Model Context Protocol tool servers"
  },
  {
    type: "ending",
    title: "Ending",
    icon: TbPercentage,
    color: "mint",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    desc: "Concludes conversation and hangs up call"
  },
  {
    type: "note",
    title: "Note",
    icon: TbFileDescription,
    color: "yellow",
    iconBg: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    desc: "Sticky documentation note on workflow canvas"
  }
];

