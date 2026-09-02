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
    <div className={`p-2 md:p-4 border-t-0 md:border-t ${
      "bg-transparent md:bg-interactive-base md:border-border-primary dark:md:border-border-primary/80"
    }`}>
      <div className={`
        w-full max-w-3xl mx-auto
        flex flex-col gap-2 p-3 bg-white dark:bg-[#282828] border border-border-primary dark:border-[#383838] rounded-[24px] shadow-sm
        md:flex-row md:items-center md:bg-transparent dark:md:bg-transparent md:border-0 md:p-0 md:rounded-none md:shadow-none
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
            w-full p-2 text-sm bg-transparent border-0 text-text-primary dark:text-white
            md:flex-1 md:p-3 md:rounded-xl md:text-xs md:bg-white md:border md:border-border-primary md:focus:border-text-primary/30 dark:md:bg-[#1a1a1a] dark:md:border-transparent
          `}
        />

        <div className="flex items-center gap-2 justify-end shrink-0">
          {/* Microphone Button */}
          <button
            onClick={handleVoiceClick}
            type="button"
            disabled={isGenerating}
            className={`
              transition-colors duration-200 shrink-0 cursor-pointer flex items-center justify-center
              p-2 rounded-full border border-transparent bg-transparent text-text-muted
              md:p-3 md:rounded-xl md:shadow-sm md:text-text-primary
              ${isListening 
                ? "bg-text-primary animate-pulse text-text-inverse dark:bg-white dark:text-black md:bg-text-primary dark:md:bg-white" 
                : "hover:text-text-primary md:bg-white md:hover:bg-surface-secondary md:border-border-primary dark:md:bg-interactive-active dark:md:hover:bg-interactive-base dark:md:border-transparent dark:md:text-text-muted"
              }
            `}
            title={isListening ? "Stop Recording" : "Record Voice"}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              </svg>
            )}
          </button>

          {/* Send / Stop Button */}
          {isGenerating ? (
            <button
              onClick={onStop}
              type="button"
              className="w-10 h-10 rounded-full bg-black hover:bg-interactive-active border border-border-primary flex items-center justify-center transition shrink-0 cursor-pointer shadow-lg active:scale-95 text-white"
              title="Stop Generating"
            >
              <div className="w-3.5 h-3.5 bg-white rounded-[2px]" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              type="button"
              className={`
                shrink-0 font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center
                w-8 h-8 rounded-full bg-interactive-active text-text-primary dark:bg-white dark:text-black shadow-sm
                md:w-auto md:h-auto md:px-5 md:py-2.5 md:rounded-xl md:text-xs md:shadow-md md:border md:border-transparent md:bg-text-primary md:text-text-inverse dark:md:border-border-primary/50 dark:md:bg-interactive-active dark:md:hover:bg-interactive-base dark:md:text-white
              `}
            >
              <span className="hidden md:block">Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 md:hidden">
                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;