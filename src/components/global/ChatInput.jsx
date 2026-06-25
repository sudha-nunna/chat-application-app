// import { useState } from "react";

// const ChatInput = ({ onSend }) => {
//   const [text, setText] = useState("");

//   const handleSend = () => {
//     if (!text.trim()) return;

//     onSend(text);

//     setText("");
//   };

//   return (
//     <div className="p-4 border-t border-gray-700">
//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={text}
//           placeholder="Ask anything..."
//           onChange={(e) =>
//             setText(e.target.value)
//           }
//           onKeyDown={(e) =>
//             e.key === "Enter" &&
//             handleSend()
//           }
//           className="flex-1 p-3 rounded-lg bg-[#40414f] text-white outline-none"
//         />

//         <button
//           onClick={handleSend}
//           className="bg-green-600 px-6 rounded-lg text-white"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ChatInput;




import { useState, useEffect } from "react";

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false; // Stop automatically when the user pauses speaking
      rec.lang = "en-US";     // Set language preference (e.g., "en-US", "hi-IN")
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Append the recognized text directly to the input field text state
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
    if (!text.trim()) return;

    onSend(text);
    setText("");
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          placeholder={isListening ? "Listening..." : "Ask anything..."}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 p-3 rounded-lg bg-[#40414f] text-white outline-none"
        />

        {/* Microphone Button */}
        <button
          onClick={handleVoiceClick}
          type="button"
          className={`px-4 rounded-lg text-white transition-colors duration-200 ${
            isListening 
              ? "bg-red-600 animate-pulse hover:bg-red-700" 
              : "bg-gray-600 hover:bg-gray-500"
          }`}
          title={isListening ? "Stop Recording" : "Record Voice"}
        >
          {isListening ? (
            /* Stop/Recording icon */
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
            </svg>
          ) : (
            /* Microphone icon */
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleSend}
          className="bg-green-600 px-6 rounded-lg text-white hover:bg-green-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInput;