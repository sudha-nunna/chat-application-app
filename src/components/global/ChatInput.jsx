import { useState, useEffect } from "react";

const ChatInput = ({ onSend, isGenerating, onStop }) => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

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
        const transcript = event.results[0][0].transcript;
        setText((prevText) => (prevText ? `${prevText} ${transcript}` : transcript));
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceClick = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isGenerating) return;

    onSend(text);
    setText("");
  };

  return (
    <div className="p-4 border-t border-slate-800/80 bg-slate-950">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <input
          type="text"
          value={text}
          placeholder={isListening ? "Listening..." : "Ask anything..."}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleSend()}
          disabled={isGenerating}
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-blue-500 text-xs transition placeholder:text-slate-500 disabled:opacity-75"
        />

        {/* Microphone Button */}
        <button
          onClick={handleVoiceClick}
          type="button"
          disabled={isGenerating}
          className={`p-3 rounded-xl text-white transition-colors duration-200 shrink-0 ${
            isListening 
              ? "bg-rose-600 animate-pulse hover:bg-rose-700" 
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
          title={isListening ? "Stop Recording" : "Record Voice"}
        >
          {isListening ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            </svg>
          )}
        </button>

        {/* ChatGPT Style Stop Button vs Send Button */}
        {isGenerating ? (
          <button
            onClick={onStop}
            type="button"
            className="w-10 h-10 rounded-full bg-black hover:bg-slate-900 border border-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer shadow-lg active:scale-95"
            title="Stop Generating"
          >
            <div className="w-3.5 h-3.5 bg-white rounded-[2px]" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            type="button"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-50 text-xs shadow-md"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;