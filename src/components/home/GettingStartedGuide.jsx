import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronUp,
  Bot
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CHECKLIST_ITEMS = [
  {
    id: "build-agent",
    label: "Build your first agent",
    completed: true,
    desc: "Design your agent's persona, system instructions, and voice profile.",
    buttonText: "Build an Agent",
    path: "/agents/new",
    previewType: "agent"
  },
  {
    id: "test-call",
    label: "Run a test call",
    completed: true,
    desc: "Test your agent in a real-time browser audio webcall.",
    buttonText: "Run test call",
    path: "/agents",
    previewType: "test"
  },
  {
    id: "view-analysis",
    label: "View transcript and analysis",
    completed: true,
    desc: "Review the full conversation log and AI-generated analysis from your test call.",
    buttonText: "View analysis",
    path: "/call-history",
    previewType: "analysis"
  },
  {
    id: "add-phone",
    label: "Add a phone number",
    completed: false,
    desc: "Connect a number so your agent can make and receive real calls.",
    buttonText: "Set up a phone number",
    path: "/phone-numbers",
    previewType: "phone"
  },
  {
    id: "make-call",
    label: "Make your first real call",
    completed: false,
    locked: true,
    desc: "Dial an external number with your deployed conversational agent.",
    buttonText: "Make real call",
    path: "/phone-numbers",
    previewType: "phone"
  },
  {
    id: "invite-teammate",
    label: "Invite a teammate",
    completed: false,
    desc: "Collaborate on conversation flows and monitor live agent performances.",
    buttonText: "Invite team",
    path: "/settings",
    previewType: "team"
  }
];

const GettingStartedGuide = () => {
  const [selectedId, setSelectedId] = useState("add-phone");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const navigate = useNavigate();

  const activeItem =
    CHECKLIST_ITEMS.find((item) => item.id === selectedId) || CHECKLIST_ITEMS[3];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-6 rounded-2xl border border-border-primary/80 bg-surface-secondary/50 dark:bg-[#10121A] shadow-sm select-none">
      <h3 className="text-base font-bold text-text-primary mb-4">Getting started</h3>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Checklist */}
        <div className="md:col-span-6 space-y-1">
          {CHECKLIST_ITEMS.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#EAECEF] text-text-primary dark:bg-white/10 font-semibold"
                    : "text-text-muted hover:text-text-primary hover:bg-black/4 dark:hover:bg-white/5"
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-text-muted shrink-0" />
                ) : item.locked ? (
                  <Lock className="w-4 h-4 text-text-muted/50 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-text-muted/60 shrink-0" />
                )}
                <span
                  className={`truncate ${
                    item.completed ? "line-through text-text-muted" : ""
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}

          {/* Try Advanced Functions Accordion */}
          <div className="pt-1">
            <div
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-text-muted hover:text-text-primary cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <Circle className="w-4 h-4 text-text-muted/60" />
                <span>Try advanced functions</span>
              </div>
              {isAdvancedOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>

            {isAdvancedOpen && (
              <div className="pl-9 pr-3 pt-1 space-y-1">
                <div
                  onClick={() => navigate("/analytics")}
                  className="flex items-center gap-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <Circle className="w-3.5 h-3.5 text-text-muted/40" />
                  <span>Use simulation testing</span>
                </div>
                <div
                  onClick={() => navigate("/ai-qa")}
                  className="flex items-center gap-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <Circle className="w-3.5 h-3.5 text-text-muted/40" />
                  <span>Run AI quality assurance</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview Card */}
        <div className="md:col-span-6 flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#161822] border border-border-primary/80 shadow-sm min-h-[220px]">
          <div>
            {/* Visual Graphic Representation */}
            {activeItem.previewType === "phone" && (
              <div className="p-3.5 rounded-xl bg-surface-secondary dark:bg-black/30 border border-border-primary/50 text-xs mb-3 space-y-2">
                <div className="flex items-center justify-between font-mono font-bold text-text-primary">
                  <span>+1 (415) 123-1234</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[11px] text-text-muted">Inbound Call Agent: Primary</div>
                <div className="h-1.5 w-3/4 rounded-full bg-border-primary/50" />
                <div className="h-1.5 w-1/2 rounded-full bg-border-primary/40" />
              </div>
            )}

            {activeItem.previewType === "analysis" && (
              <div className="p-3.5 rounded-xl bg-surface-secondary dark:bg-black/30 border border-border-primary/50 text-xs mb-3 space-y-1.5">
                <div className="font-bold text-text-primary text-[11px]">
                  Conversation Analysis
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Call Successful</span>
                  <span className="text-emerald-500 font-semibold">Yes</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>User Sentiment</span>
                  <span className="text-blue-400 font-semibold">Positive</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Latency</span>
                  <span>740 ms</span>
                </div>
              </div>
            )}

            {activeItem.previewType !== "phone" &&
              activeItem.previewType !== "analysis" && (
                <div className="p-3.5 rounded-xl bg-surface-secondary dark:bg-black/30 border border-border-primary/50 text-xs mb-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{activeItem.label}</p>
                    <p className="text-[11px] text-text-muted">Interactive Guide</p>
                  </div>
                </div>
              )}

            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              {activeItem.desc}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => navigate(activeItem.path)}
              className="px-4 py-2 rounded-xl bg-text-primary text-surface-primary dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition cursor-pointer shadow-xs"
            >
              {activeItem.buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedGuide;
