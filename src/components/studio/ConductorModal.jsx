import { useState } from "react";
import { FiX } from "react-icons/fi";
import { TbSparkles } from "react-icons/tb";

export default function ConductorModal({ isOpen, onClose, onApplyFlow }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      // Generate standard structured conversation nodes based on prompt
      const generatedNodes = [
        {
          id: "welcome-node",
          type: "conversation",
          title: "Welcome Node",
          badge: "Global",
          color: "pink",
          x: 260,
          y: 300,
          data: {
            text: "Hello! Thank you for contacting customer support. How can I assist you today?",
            transitions: [
              { id: "t1", label: "= User requests data lookup", target: "function-node" },
              { id: "t2", label: "= User needs specialized assistance", target: "subagent-node" }
            ]
          }
        },
        {
          id: "function-node",
          type: "function",
          title: "Function Tool",
          color: "purple",
          x: 580,
          y: 200,
          data: {
            functionName: "Query Database & Knowledge Base",
            transitions: [
              { id: "t3", label: "= Parameter extraction", target: "extract-node" }
            ]
          }
        },
        {
          id: "extract-node",
          type: "extract_variable",
          title: "Extract Variable",
          color: "slate",
          x: 880,
          y: 220,
          data: {
            variableName: "Extract customer_id & issue_type",
            transitions: [
              { id: "t4", label: "= Flow resolved", target: "end-node" }
            ]
          }
        },
        {
          id: "subagent-node",
          type: "subagent",
          title: "Subagent",
          color: "green",
          x: 580,
          y: 420,
          data: {
            text: "Delegates inquiry to autonomous Support Subagent.",
            transitions: [
              { id: "t5", label: "= Task complete", target: "end-node" }
            ]
          }
        },
        {
          id: "end-node",
          type: "ending",
          title: "Ending",
          color: "mint",
          x: 880,
          y: 440,
          data: {
            reason: "Workflow complete"
          }
        }
      ];

      setIsGenerating(false);
      onApplyFlow(generatedNodes);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface-primary dark:bg-surface-secondary border border-border-primary rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-primary/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <TbSparkles className="text-base" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">AI Flow Conductor</h2>
              <p className="text-xs text-text-muted">Describe the conversation flow you want to construct</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary/70 transition cursor-pointer"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Conversation Flow Goal &amp; Logic
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Create a customer support agent that greets callers, offers package returns or order status checking, sends SMS confirmations, and handles call transfers..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-surface-primary border border-border-primary text-text-primary focus:outline-hidden focus:border-accent-primary focus:ring-1 focus:ring-accent-primary leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              "Customer Service & Returns Flow",
              "Appointment Booking & In-Call SMS",
              "Order Status Verification by Digit Keypad"
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPrompt(preset)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-secondary text-text-muted hover:text-text-primary hover:bg-surface-secondary/80 border border-border-primary/40 transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-primary/60 bg-surface-secondary/30 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-primary hover:opacity-95 text-white flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Flow...</span>
              </>
            ) : (
              <>
                <TbSparkles className="text-xs" />
                <span>Generate Flow Nodes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
