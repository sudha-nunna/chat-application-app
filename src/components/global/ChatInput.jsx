import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { VoiceRecorder } from "../../utils/voiceRecorder";
import { FiDatabase, FiStar, FiZap } from "react-icons/fi";

const ChatInput = ({ onSend, isGenerating, onStop }) => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const voiceRecorderRef = useRef(new VoiceRecorder());
  const { isDark } = useTheme();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState({
    displayName: "Auto Cluster",
    modelId: "auto",
    provider: "system",
  });
  const [modelsList, setModelsList] = useState([]);
  const [activeTab, setActiveTab] = useState("All Servers");
  const [userCredits, setUserCredits] = useState(0);
  const modelMenuRef = useRef(null);

  useEffect(() => {
    if (isModelMenuOpen) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.credits !== undefined) setUserCredits(u.credits);
        } catch (e) {}
      }
    }
  }, [isModelMenuOpen]);

  const getProvider = (m) => {
    let p = m.provider || m.serverFormat || "";
    p = p.toLowerCase().trim();
    if (!p || p === "system") {
      const mid = (m.modelId || "").toLowerCase();
      if (mid.includes("gemini")) return "gemini";
      if (mid.includes("gpt")) return "openai";
      if (mid.includes("llama")) return "ollama";
      if (mid.includes("glm")) return "glm";
      if (p) return p;
      return "other";
    }
    return p;
  };

  const providers = [
    "All Servers",
    ...new Set(modelsList.map((m) => getProvider(m)).filter(Boolean)),
  ];
  const filteredModels =
    activeTab === "All Servers"
      ? modelsList.filter((m) => m.enabled && m.modelId !== "auto")
      : modelsList.filter(
          (m) =>
            m.enabled && getProvider(m) === activeTab && m.modelId !== "auto",
        );

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/models/available`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();

        if (data.success && data.models) {
          // Log the providers for debugging as requested
          const allProviders = data.models.map((m) => m.provider);
          const uniqueProviders = [...new Set(allProviders)];
          console.log("📦 All Providers from Data:", allProviders);
          console.log("✨ Unique Providers:", uniqueProviders);

          setModelsList(data.models);
          const recommended =
            data.models.find((m) => m.recommended && m.enabled) ||
            data.models.find((m) => m.enabled);
          if (recommended) setSelectedModel(recommended);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target)
      ) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false; // Stop automatically when the user pauses speaking
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript && transcript.trim()) {
          setText(transcript);
        }
      };

      rec.onerror = (event) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition warning:", event.error);
        }
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceClick = async () => {
    try {
      if (isListening) {
        setIsListening(false);
        if (recognition) {
          try {
            recognition.stop();
          } catch (e) {}
        }
        const audioBlob = await voiceRecorderRef.current
          .stopRecording()
          .catch(() => null);
        if (audioBlob && onSend) {
          onSend(text, audioBlob, selectedModel.modelId);
          setText("");
        }
      } else {
        await voiceRecorderRef.current.startRecording().catch((err) => {
          console.warn("MediaRecorder start notice:", err.message);
        });
        if (recognition) {
          try {
            recognition.abort();
            setTimeout(() => recognition.start(), 50);
          } catch (e) {}
        }
        setIsListening(true);
      }
    } catch (err) {
      console.warn("Voice toggle error:", err);
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if (!text.trim() || isGenerating) return;

    onSend(text, null, selectedModel.modelId);
    setText("");
  };

  return (
    <div className={`px-4 py-2 md:py-3 bg-transparent w-full`}>
      <div
        className={`
        w-full max-w-2xl md:max-w-[720px] mx-auto relative flex flex-col p-2.5 md:p-3
        bg-white dark:bg-[#191A24] border border-border-primary dark:border-white/5
        rounded-2xl shadow-lg focus-within:border-border-focus dark:focus-within:border-white/10
        transition-all duration-300
      `}
      >
        <input
          type="text"
          value={text}
          placeholder={
            isListening
              ? "Listening..."
              : "Ask Codegene to build, explain, or explore..."
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleSend()}
          disabled={isGenerating}
          className={`
            outline-none transition placeholder:text-text-muted disabled:opacity-75
            w-full py-1 px-2.5 text-sm md:text-[14px] bg-transparent border-0 text-text-primary dark:text-white mb-1.5
          `}
        />

        <div className="flex items-center justify-between w-full mt-1">
          <div className="flex items-center gap-2 md:pl-2">
            <button className="group flex items-center gap-3 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-[10px] border border-border-primary dark:border-white/5 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-200 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-text-muted dark:text-[#8A8A93] group-hover:text-text-primary dark:group-hover:text-white transition-colors duration-200"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                  />
                </svg>
              </div>
              <span className="text-text-muted dark:text-[#8A8A93] group-hover:text-text-primary dark:group-hover:text-white text-[13px] font-medium tracking-wide transition-colors duration-200">
                Attach
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Model Selector */}
            <div className="relative" ref={modelMenuRef}>
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="text-text-muted dark:text-[#8A8A93] hover:text-text-primary dark:hover:text-white transition flex items-center gap-1 md:gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                {selectedModel.displayName}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isModelMenuOpen ? "rotate-180" : ""}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div 
                className={`absolute bottom-full right-0 mb-2 w-48 bg-surface-dropdown dark:bg-[#191A24] border border-border-primary dark:border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-200 origin-bottom-right ${isModelMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
              >
                <div className="p-1.5 flex flex-col gap-0.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {filteredModels.map((model, index) => (
                    <button
                      key={`${model.modelId}-${model.serverId || index}`}
                      onClick={() => {
                        setSelectedModel(model);
                        setIsModelMenuOpen(false);
                      }}
                      className={`text-left px-3 py-2 text-[11px] md:text-[13px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        selectedModel.modelId === model.modelId 
                          ? "bg-accent-primary/10 text-text-primary dark:text-[#e5e5e5]" 
                          : "text-text-muted dark:text-[#8A8A93] hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-[#e5e5e5]"
                      }`}
                    >
                      {model.displayName || model.modelId}
                      {selectedModel.modelId === model.modelId && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent-primary">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <div className="text-center py-4 text-text-muted dark:text-[#888] text-xs">
                      No models found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Microphone Button */}
            <button
              onClick={handleVoiceClick}
              type="button"
              disabled={isGenerating}
              className={`
                transition-colors duration-200 cursor-pointer flex items-center justify-center
                w-8 h-8 rounded-lg
                ${
                  isListening
                    ? "bg-accent-primary text-white animate-pulse"
                    : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
                }
              `}
              title={isListening ? "Stop Recording" : "Record Voice"}
            >
              {isListening ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                  />
                </svg>
              )}
            </button>

            {/* Send / Stop Button */}
            {isGenerating ? (
              <button
                onClick={onStop}
                type="button"
                className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center transition cursor-pointer active:scale-95 text-white"
                title="Stop Generating"
              >
                <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                type="button"
                className={`
                  shrink-0 font-medium transition-all cursor-pointer flex items-center justify-center
                  w-8 h-8 rounded-lg bg-accent-primary text-white hover:opacity-90 shadow-sm
                  active:scale-95 ${!text.trim() ? "opacity-50" : ""}
                `}
                disabled={!text.trim()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-center mt-1">
        <span className="text-[10px] md:text-[11px] font-medium text-text-muted dark:text-[#a1a1a1]">
          Design preview - responses are illustrative.
        </span>
      </div>
    </div>
  );
};

export default ChatInput;
