import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { VoiceRecorder } from "../../utils/voiceRecorder";

const ChatInput = ({ onSend, isGenerating, onStop }) => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const voiceRecorderRef = useRef(new VoiceRecorder());
  const { isDark } = useTheme();

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
          try { recognition.stop(); } catch (e) {}
        }
        const audioBlob = await voiceRecorderRef.current.stopRecording().catch(() => null);
        if (audioBlob && onSend) {
          onSend(text, audioBlob);
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

    onSend(text);
    setText("");
  };

  return (
    <div className={`p-4 md:p-6 pb-3 md:pb-3 bg-transparent w-full`}>
      <div className={`
        w-full max-w-4xl mx-auto relative
        flex flex-row items-center gap-2 p-2 
        bg-white dark:bg-[#1e1e1e] border border-border-primary dark:border-[#383838] 
        rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] 
        hover:shadow-[0_0_25px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] 
        transition-shadow duration-300
      `}>
        <input
          type="text"
          value={text}
          placeholder={isListening ? "Listening..." : "Ask anything..."}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleSend()}
          disabled={isGenerating}
          className={`
            outline-none transition placeholder:text-text-secondary disabled:opacity-75
            w-full py-2.5 px-4 text-[15px] bg-transparent border-0 text-text-primary dark:text-white flex-1
          `}
        />

        <div className="flex items-center gap-1.5 pr-2 shrink-0">
          {/* Microphone Button */}
          <button
            onClick={handleVoiceClick}
            type="button"
            disabled={isGenerating}
            className={`
              transition-colors duration-200 cursor-pointer flex items-center justify-center
              w-9 h-9 rounded-full
              ${isListening 
                ? "bg-text-primary text-text-inverse animate-pulse dark:bg-white dark:text-black" 
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/10"
              }
            `}
            title={isListening ? "Stop Recording" : "Record Voice"}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              </svg>
            )}
          </button>

          {/* Send / Stop Button */}
          {isGenerating ? (
            <button
              onClick={onStop}
              type="button"
              className="w-9 h-9 rounded-full bg-black hover:bg-black/80 dark:bg-white dark:hover:bg-white/80 flex items-center justify-center transition cursor-pointer active:scale-95 text-white dark:text-black"
              title="Stop Generating"
            >
              <div className="w-3.5 h-3.5 bg-white dark:bg-black rounded-[2px]" />
            </button>
          ) : text.trim() ? (
            <button
              onClick={handleSend}
              type="button"
              className={`
                shrink-0 font-medium transition-all cursor-pointer flex items-center justify-center
                w-9 h-9 rounded-full bg-text-primary text-text-inverse dark:bg-white dark:text-black shadow-sm
                hover:opacity-90 active:scale-95
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="text-center mt-3 hidden md:block">
        <span className="text-[11px] font-medium text-text-muted dark:text-[#a1a1a1]">
          Nexora is AI and can make mistakes.
        </span>
      </div>
    </div>
  );
};

export default ChatInput;